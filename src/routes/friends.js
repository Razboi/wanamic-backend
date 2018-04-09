const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	tokenVerifier = require( "../utils/tokenVerifier" );

// Add friend
Router.post( "/add", ( req, res, next ) => {
	var
		err,
		userId;

	if ( !req.body.token || !req.body.friendUsername ) {
		err = new Error( "Empty data" );
		err.statusCode = 422;
		return next( err );
	}

	userId = tokenVerifier( req.body.token, next );

	User.findById( userId )
		.exec()
		.then( user => {
			User.findOne({ email: req.body.friendUsername })
				.exec()
				.then( friend => {
					user.friends.push( friend._id );
					user.save();
					res.sendStatus( 201 );
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


// Delete friend
Router.delete( "/delete", ( req, res, next ) => {
	var
		err,
		userId;

	if ( !req.body.token || !req.body.friendUsername ) {
		err = new Error( "Empty data" );
		err.statusCode = 422;
		return next( err );
	}

	userId = tokenVerifier( req.body.token, next );

	User.findById( userId )
		.exec()
		.then( user => {
			User.find({ username: req.body.friendUsername })
				.exec()
				.then( friend => {
					const friendIndex = user.friends.indexOf( friend._id );
					user.friends.splice( friendIndex, 1 );
					user.save()
						.then(() => res.sendStatus( 200 ))
						.catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

module.exports = Router;
