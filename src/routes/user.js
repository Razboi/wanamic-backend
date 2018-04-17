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
		.exec()
		.then( user => {
			if ( !user ) {
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
			}
			data = {
				username: user.username, fullname: user.fullname, friends: user.friends,
				description: user.description, keywords: user.keywords,
				profileImage: user.profileImage, headerImage: user.headerImage,
				interests: user.interests
			};
			res.send( data );
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
			if ( data.keywords ) {
				user.keywords = data.keywords;
			}
			if ( data.fullname ) {
				user.fullname = data.fullname;
			}
			if ( data.username ) {
				user.username = data.username;
			}
			if ( data.interests ) {
				data.interests.map(( interest, index ) => {
					if ( !user.interests.includes( interest )) {
						user.interests.push( interest );
					}
				});
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


module.exports = Router;