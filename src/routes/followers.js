const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	tokenVerifier = require( "../utils/tokenVerifier" );

Router.post( "/follow", ( req, res, next ) => {
	var
		err,
		userId;

	if ( !req.body.token || !req.body.targetUsername ) {
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
			User.findOne({ email: req.body.targetUsername })
				.exec()
				.then( target => {
					if ( !target ) {
						err = new Error( "User doesn't exist" );
						err.statusCode = 404;
						return next( err );
					}
					target.followers.push( user._id );
					target.save();
					user.following.push( target._id );
					user.save();
					res.sendStatus( 201 );
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


Router.delete( "/unfollow", ( req, res, next ) => {
	var
		err,
		userId;

	if ( !req.body.token || !req.body.targetUsername ) {
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
			User.findOne({ email: req.body.targetUsername })
				.exec()
				.then( target => {
					if ( !target ) {
						err = new Error( "User doesn't exist" );
						err.statusCode = 404;
						return next( err );
					}
					const
						targetIndex = user.following.indexOf( target._id ),
						userIndex = target.followers.indexOf( user._id );
					user.following.splice( targetIndex, 1 );
					user.save();
					target.followers.splice( userIndex, 1 );
					target.save();
					res.sendStatus( 200 );
				}).catch( err => next( err ));
		}).catch( err => next( err ));

});


module.exports = Router;
