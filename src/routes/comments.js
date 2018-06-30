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

Router.post( "/create", ( req, res, next ) => {
	var
		data,
		mediaImg,
		userId;

	if ( !req.body.token || !req.body.comment || !req.body.postId ) {
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
			Post.findById( data.postId )
				.populate({ path: "sharedPost" })
				.exec()
				.then( post => {
					if ( !post ) {
						return next( errors.postDoesntExist());
					}
					if ( post.link ) {
						mediaImg = post.linkContent.image;
					} else {
						mediaImg = post.mediaContent.image;
					}

					new Comment({
						author: user.username,
						authorFullname: user.fullname,
						authorImg: user.profileImage,
						content: data.comment,
						post: post._id
					}).save()
						.then( newComment => {
							post.comments.push( newComment._id );
							post.save();

							notifyMentions( req.body.mentions, "comment", post, user )
								.then( mentionsNotifications => {

									User.findOne({ username: post.author })
										.exec()
										.then( postAuthor => {
											if ( postAuthor.username !== user.username ) {
												new Notification({
													author: user.username,
													authorFullname: user.fullname,
													authorImg: user.profileImage,
													receiver: postAuthor.username,
													content: "commented on your post",
													mediaImg: mediaImg,
													externalImg: !post.picture,
													object: post._id,
													comment: true
												}).save()

													.then( commentNotification => {
														postAuthor.notifications.push( commentNotification );
														postAuthor.save();
														res.status( 201 );
														res.send({
															newComment: newComment,
															updatedPost: post,
															commentNotification: commentNotification,
															mentionsNotifications: mentionsNotifications
														});
													}).catch( err => next( err ));

											} else {
												res.status( 201 );
												res.send({
													newComment: newComment,
													updatedPost: post,
													mentionsNotifications: mentionsNotifications
												});
											}

										}).catch( err => next( err ));
								}).catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

Router.delete( "/delete", ( req, res, next ) => {
	var
		data,
		userId;

	if ( !req.body.token || !req.body.commentId || !req.body.postId ) {
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
			Post.findById( data.postId )
				.exec()
				.then( post => {
					if ( !post ) {
						return next( errors.postDoesntExist());
					}
					const commentIndex = post.comments.indexOf( data.commentId );
					post.comments.splice( commentIndex, 1 );
					post.save().catch( err => next( err ));

					Comment.findById( data.commentId )
						.then( comment => {
							if ( user.username !== comment.author ) {
								return next( errors.unauthorized());
							}
							comment.remove()
								.then(() => res.send( post ))
								.catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
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
					if ( user.username !== comment.author ) {
						return next( errors.unauthorized());
					}
					comment.content = data.newContent;
					comment.save()
						.then(() => res.sendStatus( 200 ))
						.catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


Router.post( "/postComments/:skip", ( req, res, next ) => {
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
