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

	try {
		userId = tokenVerifier( req.body.token );
	} catch ( err ) {
		return next( err );
	}

	User.findById( userId )
		.exec()
		.then( user => {
			if ( !user ) {
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
			}

			User.findOne({ username: req.body.friendUsername })
				.exec()
				.then( friend => {
					if ( !friend ) {
						err = new Error( "User doesn't exist" );
						err.statusCode = 404;
						return next( err );
					}
					user.friends.push( friend._id );
					user.save();
					friend.friends.push( user._id );
					friend.save();
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

	try {
		userId = tokenVerifier( req.body.token );
	} catch ( err ) {
		return next( err );
	}

	User.findById( userId )
		.exec()
		.then( user => {
			if ( !user ) {
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
			}
			User.findOne({ username: req.body.friendUsername })
				.exec()
				.then( friend => {
					if ( !friend ) {
						err = new Error( "User doesn't exist" );
						err.statusCode = 404;
						return next( err );
					}
					const
						friendIndex = user.friends.indexOf( friend._id ),
						userIndex = friend.friends.indexOf( user._id );
					user.friends.splice( friendIndex, 1 );
					user.save();
					friend.friends.splice( userIndex, 1 );
					friend.save();
					res.sendStatus( 200 );
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

module.exports = Router;
