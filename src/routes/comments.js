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
			new Comment({
				author: user.username,
				content: data.comment
			}).save()
				.then( newComment => {
					Post.findById( data.postId )
						.exec()
						.then( post => {
							post.comments.push( newComment._id );
							post.save()
								.then(() => res.sendStatus( 201 ))
								.catch( err => console.log( err ));
						}).catch( err => next( err ));
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
