const
	Router = require( "express" ).Router(),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../utils/tokenGenerator" ),
	User = require( "../models/User" ),
	Post = require( "../models/Post" ),
	Comment = require( "../models/Comment" ),
	Notification = require( "../models/Notification" ),
	notifyMentions = require( "../utils/notifyMentions" ),
	errors = require( "../utils/errors" );

Router.post( "/create", async( req, res, next ) => {
	var
		data,
		mediaImg,
		userId,
		user,
		post,
		newComment,
		commentNotification;

	if ( !req.body.token || !req.body.comment || !req.body.postId ) {
		return next( errors.blankData());
	}

	const { token, comment, postId, mentions } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId )
			.select( "username fullname profileImage" )
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		post = await Post.findById( postId )
			.populate({
				path: "sharedPost",
				populate: {
					path: "author",
					select: "fullname username profileImage",
				}
			})
			.exec();
		if ( !post ) {
			return next( errors.postDoesntExist());
		}
		if ( post.link ) {
			mediaImg = post.linkContent.image;
		} else {
			mediaImg = post.mediaContent.image;
		}

		newComment = await new Comment({
			author: user._id,
			content: comment,
			post: post._id
		}).save();

		post.comments.push( newComment._id );
		post.save();

		mentionsNotifications = await notifyMentions(
			mentions, "comment", post, user );

		postAuthor = await User.findById( post.author ).exec();

		if ( !postAuthor._id.equals( user._id )) {
			commentNotification = await new Notification({
				author: user._id,
				receiver: postAuthor._id,
				content: "commented on your post",
				mediaImg: mediaImg,
				externalImg: !post.picture,
				object: post._id,
				comment: true
			}).save();

			postAuthor.notifications.push( commentNotification );
			postAuthor.newNotifications++;
			postAuthor.save();
			commentNotification.author = user;
		}
	} catch ( err ) {
		return next( err );
	}
	newComment.author = user;
	post.author = user;

	res.status( 201 );
	res.send({
		newComment: newComment,
		updatedPost: post,
		commentNotification: commentNotification,
		mentionsNotifications: mentionsNotifications
	});
});

Router.delete( "/delete", async( req, res, next ) => {
	var
		userId,
		user,
		post,
		comment;

	if ( !req.body.token || !req.body.commentId || !req.body.postId ) {
		return next( errors.blankData());
	}

	const { token, commentId, postId } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId )
			.select( "username fullname profileImage" )
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}

		comment = await Comment.findById( commentId ).exec();
		if ( !user._id.equals( comment.author )) {
			return next( errors.unauthorized());
		}
		await comment.remove();
		updatedPost = await Post.findById( postId ).exec();
	} catch ( err ) {
		return next( err );
	}
	updatedPost.author = user;
	res.send( updatedPost );
});

Router.patch( "/update", async( req, res, next ) => {
	var
		data,
		userId,
		user;

	if ( !req.body.token || !req.body.commentId || !req.body.newContent ) {
		return next( errors.blankData());
	}

	const { token, commentId, newContent, mentions, hashtags } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		comment = await Comment.findById( commentId )
			.populate({ path: "author", select: "username fullname profileImage" })
			.exec();
		if ( !comment ) {
			return next( errors.commentDoesntExist());
		}
		if ( !user._id.equals( comment.author._id )) {
			return next( errors.unauthorized());
		}
		comment.content = newContent;
		mentionsNotifications = await notifyMentions(
			mentions, "comment", comment, user );
		await comment.save();
	} catch ( err ) {
		return next( err );
	}
	res.send({
		mentionsNotifications: mentionsNotifications,
		updatedComment: comment
	});
});


Router.post( "/retrieve/:skip", async( req, res, next ) => {
	var
		data,
		userId,
		post;

	if ( !req.body.token || !req.body.postId || !req.params.skip ) {
		return next( errors.blankData());
	}

	data = req.body;

	try {
		userId = await tokenVerifier( data.token );
		post = await Post.findById( data.postId )
			.populate({
				path: "comments",
				populate: {
					path: "author",
					select: "username fullname profileImage"
				},
				options: {
					limit: 10,
					skip: req.params.skip * 10,
					sort: { createdAt: -1 }
				}
			})
			.exec();
		if ( !post ) {
			return next( errors.postDoesntExist());
		}
	} catch ( err ) {
		return next( err );
	}
	res.send( post.comments );
});

module.exports = Router;
