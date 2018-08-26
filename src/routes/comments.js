const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	Post = require( "../models/Post" ),
	Comment = require( "../models/Comment" ),
	Notification = require( "../models/Notification" ),
	Ticket = require( "../models/Ticket" ),
	notifyMentions = require( "../utils/notifyMentions" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	errors = require( "../utils/errors" );

Router.post( "/create", async( req, res, next ) => {
	let
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
		userId = tokenVerifier( token );
		user = User.findById( userId )
			.select( "username fullname profileImage" )
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		post = Post.findById( postId )
			.populate({
				path: "author",
				select: "fullname username profileImage"
			})
			.populate({
				path: "sharedPost",
				populate: {
					path: "author",
					select: "fullname username profileImage"
				}
			})
			.exec();
		[ user, post ] = await Promise.all([ user, post ]);
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
		mentionsNotifications = notifyMentions(
			mentions, "comment", post, user );
		postAuthor = User.findById( post.author ).exec();
		[ post, mentionsNotifications, postAuthor ] =
			await Promise.all([ post.save(), mentionsNotifications, postAuthor ]);

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
			await postAuthor.save();
			commentNotification.author = user;
		}
		newComment.author = user;
	} catch ( err ) {
		return next( err );
	}
	res.status( 201 );
	res.send({
		newComment: newComment,
		updatedPost: post,
		commentNotification: commentNotification,
		mentionsNotifications: mentionsNotifications
	});
});


Router.delete( "/delete", async( req, res, next ) => {
	let
		userId,
		user,
		updatedPost,
		comment;

	if ( !req.body.token || !req.body.commentId || !req.body.postId ) {
		return next( errors.blankData());
	}
	const { token, commentId, postId } = req.body;

	try {
		userId = tokenVerifier( token );
		user = User.findById( userId )
			.select( "username fullname profileImage" )
			.exec();
		comment = Comment.findById( commentId ).exec();
		[ user, comment ] = await Promise.all([ user, comment ]);
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !user._id.equals( comment.author )) {
			return next( errors.unauthorized());
		}
		await comment.remove();
		updatedPost = await Post.findById( postId ).exec();
		updatedPost.author = user;
	} catch ( err ) {
		return next( err );
	}
	res.send( updatedPost );
});


Router.patch( "/update", async( req, res, next ) => {
	let
		userId,
		user,
		comment,
		mentionsNotifications;

	if ( !req.body.token || !req.body.commentId || !req.body.newContent ) {
		return next( errors.blankData());
	}
	const { token, commentId, newContent, mentions, hashtags } = req.body;

	try {
		userId = tokenVerifier( token );
		user = User.findById( userId ).exec();
		comment = Comment.findById( commentId )
			.populate({ path: "author", select: "username fullname profileImage" })
			.exec();
		[ user, comment ] = await Promise.all([ user, comment ]);
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !comment ) {
			return next( errors.commentDoesntExist());
		}
		if ( !user._id.equals( comment.author._id )) {
			return next( errors.unauthorized());
		}
		comment.content = newContent;
		mentionsNotifications = notifyMentions(
			mentions, "comment", comment, user );
		[ mentionsNotifications ] =
			await Promise.all([ mentionsNotifications, comment.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.send({
		mentionsNotifications: mentionsNotifications,
		updatedComment: comment
	});
});


Router.post( "/retrieve/:skip", async( req, res, next ) => {
	let
		post;

	if ( !req.body.postId || !req.params.skip ) {
		return next( errors.blankData());
	}
	const { postId } = req.body;

	try {
		post = await Post.findById( postId )
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


Router.post( "/getComment", async( req, res, next ) => {
	let
		comment;

	if ( !req.body.commentId ) {
		return next( errors.blankData());
	}

	try {
		comment = await Comment.findById( req.body.commentId )
			.populate({
				path: "author",
				select: "username fullname profileImage"
			})
			.exec();
		if ( !comment ) {
			return next( errors.commentDoesntExist());
		}
	} catch ( err ) {
		return next( err );
	}
	res.send( comment );
});


Router.post( "/report", async( req, res, next ) => {
	var
		userId,
		user,
		comment;

	if ( !req.body.commentId || !req.body.token || !req.body.content ) {
		return next( errors.blankData());
	}
	const { commentId, content, token } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		comment = await Comment.findById( commentId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		await new Ticket({
			author: user._id,
			target: comment.author,
			object: comment._id,
			content: content,
			report: true,
			type: "comment"
		}).save();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 201 );
});


module.exports = Router;
