const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	errors = require( "../utils/errors" );


Router.post( "/add", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || !req.body.friendUsername ) {
		return next( errors.blankData());
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
				return next( errors.userDoesntExist());
			}

			User.findOne({ username: req.body.friendUsername })
				.exec()
				.then( friend => {
					if ( !friend ) {
						return next( errors.userDoesntExist());
					}
					user.friends.push( friend._id );
					friend.friends.push( user._id );
					Promise.all([ user.save(), friend.save() ])
						.then(() => res.sendStatus( 201 ))
						.catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


// Delete friend
Router.delete( "/delete", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || !req.body.friendUsername ) {
		return next( errors.blankData());
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
				return next( errors.userDoesntExist());
			}
			User.findOne({ username: req.body.friendUsername })
				.exec()
				.then( friend => {
					if ( !friend ) {
						return next( errors.userDoesntExist());
					}
					const
						friendIndex = user.friends.indexOf( friend._id ),
						userIndex = friend.friends.indexOf( user._id );
					user.friends.splice( friendIndex, 1 );
					friend.friends.splice( userIndex, 1 );
					Promise.all([ user.save(), friend.save() ])
						.then(() => res.sendStatus( 200 ))
						.catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

module.exports = Router;
