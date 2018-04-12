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

	User.findOne({ email: req.params.username })
		.then( user => {
			if ( !user ) {
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
			}
			data = {
				username: user.email, fullname: user.fullname, friends: user.friends,
				description: user.description, keywords: user.keywords,
				profileImage: user.profileImage, headerImage: user.headerImage
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
			if ( req.files[ "userImage" ]) {
				console.log( "here" );
				user.profileImage = req.files[ "userImage" ][ 0 ].filename;
			}
			if ( req.files[ "headerImage" ]) {
				console.log( "here2" );
				user.headerImage = req.files[ "headerImage" ][ 0 ].filename;
			}
			user.save()
				.then( res.sendStatus( 201 ))
				.catch( err => next( err ));
		}).catch( err => next( err ));
});


module.exports = Router;
