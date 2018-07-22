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

		const commentIndex = post.comments.indexOf( commentId );
		post.comments.splice( commentIndex, 1 );
		await post.save();

		comment.remove();
	} catch ( err ) {
		return next( err );
	}
	post.author = user;
	res.send( post );
});

Router.patch( "/update", ( req, res, next ) => {
	var
		data,
		userId;

	if ( !req.body.token || !req.body.commentId || !req.body.newContent ) {
		return next( errors.blankData());
	}

	data = req.body;

	try {
		userId = tokenVerifier( data.token );
	} catch ( err ) {
		return next( err );
	}

	User.findById( userId )
		.exec()
		.then( user => {
			if ( !user ) {
				return next( errors.userDoesntExist());
			}
			Comment.findById( data.commentId )
				.then( comment => {
					if ( !comment ) {
						return next( errors.commentDoesntExist());
					}
					if ( !user._id.equals( comment.author )) {
						return next( errors.unauthorized());
					}
					comment.content = data.newContent;
					comment.save()
						.then(() => res.sendStatus( 200 ))
						.catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


Router.post( "/retrieve/:skip", ( req, res, next ) => {
	var
		data,
		userId;

	if ( !req.body.token || !req.body.postId || !req.params.skip ) {
		return next( errors.blankData());
	}

	data = req.body;

	try {
		userId = tokenVerifier( data.token );
	} catch ( err ) {
		return next( err );
	}

	Post.findById( data.postId )
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
		.exec()
		.then( post => {
			res.send( post.comments );
		}).catch( err => next( err ));
});

module.exports = Router;
