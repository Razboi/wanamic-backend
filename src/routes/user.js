const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	multer = require( "multer" ),
	upload = multer({ dest: "../wanamic-frontend/src/images" });

Router.get( "/:username", ( req, res, next ) => {
	var
		err,
		data;

	if ( !req.params.username ) {
		err = new Error( "User doesn't exist" );
		err.statusCode = 404;
		return next( err );
	}

	User.findOne({ username: req.params.username })
		.select( "username fullname description keywords profileImage headerImage" +
							" interests friends" )
		.exec()
		.then( user => {
			if ( !user ) {
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
			}
			res.send( user );
		}).catch( err => next( err ));
});


Router.post( "/info", upload.fields([ { name: "userImage", maxCount: 1 },
	{ name: "headerImage", maxCount: 1 } ]), ( req, res, next ) => {
	var
		err,
		data,
		userId;

	if ( !req.body.token ) {
		err = new Error( "Token not found" );
		err.statusCode = 422;
		return next( err );
	}

	data = req.body;

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
			if ( data.description ) {
				user.description = data.description;
			}
			if ( data.fullname ) {
				user.fullname = data.fullname;
			}
			if ( data.username ) {
				user.username = data.username;
			}
			if ( req.files && req.files[ "userImage" ]) {
				user.profileImage = req.files[ "userImage" ][ 0 ].filename;
			}
			if ( req.files && req.files[ "headerImage" ]) {
				user.headerImage = req.files[ "headerImage" ][ 0 ].filename;
			}
			user.save()
				.then( res.sendStatus( 201 ))
				.catch( err => next( err ));
		}).catch( err => next( err ));
});

Router.post( "/match", ( req, res, next ) => {
	var
		err;

	if ( !req.body.data ) {
		err = new Error( "Empty data" );
		err.statusCode = 422;
		return next( err );
	}

	User.find({ interests: { $in: req.body.data } })
		.select( "username fullname description" )
		.limit( 10 )
		.exec()
		.then( users => {
			res.send( users );
		}).catch( err => next( err ));
});

Router.post( "/addInterests", ( req, res, next ) => {
	var
		userId,
		err;

	if ( !req.body.data || !req.body.token ) {
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
			req.body.data.map(( interest, index ) => {
				if ( !user.interests.includes( interest )) {
					user.interests.push( interest );
				}
			});
			user.save();
			res.sendStatus( 201 );
		}).catch( err => next( err ));
});


Router.post( "/sugestedUsers", ( req, res, next ) => {
	var
		userId,
		err;

	if ( !req.body.token || req.body.skip === undefined ) {
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
			User.findOne({ interests: { $in: user.interests } })
				.skip( req.body.skip )
				.where( "_id" ).ne( user.id )
				.select(
					"username fullname description keywords profileImage headerImage"
				)
				.exec()
				.then( user => {
					res.send( user );
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

// retrieve a random user that is not the requester
Router.post( "/randomUser", ( req, res, next ) => {
	var
		userId,
		err,
		randomUser;

	if ( !req.body.token ) {
		err = new Error( "Empty token" );
		err.statusCode = 422;
		return next( err );
	}

	try {
		userId = tokenVerifier( req.body.token );
	} catch ( err ) {
		return next( err );
	}

	findRandomUser( userId )
		.then( user => res.send( user ))
		.catch( err => next( err ));
});


Router.post( "/matchKwUsers", ( req, res, next ) => {
	var
		userId,
		err;

	if ( !req.body.token || !req.body.data || req.body.skip === undefined ) {
		err = new Error( "Empty data" );
		err.statusCode = 422;
		return next( err );
	}

	try {
		userId = tokenVerifier( req.body.token );
	} catch ( err ) {
		return next( err );
	}

	User.findOne({ keywords: { $in: req.body.data } })
		.skip( req.body.skip )
		.where( "_id" ).ne( userId )
		.select(
			"username fullname description keywords profileImage headerImage"
		)
		.exec()
		.then( user => {
			res.send( user );
		}).catch( err => next( err ));
});


Router.post( "/setUserKw", ( req, res, next ) => {
	var
		userId,
		err;

	if ( !req.body.token || !req.body.data ) {
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
			user.keywords = req.body.data;
			user.save()
				.then(() => res.sendStatus( 201 ))
				.catch( err => console.log( err ));
		}).catch( err => next( err ));
});


module.exports = Router;
