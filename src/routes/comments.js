const
	Router = require( "express" ).Router(),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../utils/tokenGenerator" ),
	User = require( "../models/User" ),
	Post = require( "../models/Post" ),
	Comment = require( "../models/Comment" ),
	errors = require( "../utils/errors" );

Router.post( "/create", ( req, res, next ) => {
	var
		data,
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
					new Comment({
						author: user.username,
						content: data.comment,
						post: post._id
					}).save()
						.then( newComment => {
							post.comments.push( newComment._id );
							post.save()
								.then(() => {
									res.status( 201 );
									res.send({ newComment: newComment, updatedPost: post });
								}).catch( err => console.log( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

Router.delete( "/delete", ( req, res, next ) => {
	var
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
