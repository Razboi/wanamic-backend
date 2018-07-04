const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	multer = require( "multer" ),
	upload = multer({ dest: "../wanamic-frontend/src/images" }),
	findRandomUser = require( "../utils/findRandomUser" ),
	removeDuplicates = require( "../utils/removeDuplicatesArrOfObj" ),
	async = require( "async" ),
	errors = require( "../utils/errors" );

// get user info
Router.get( "/:username", ( req, res, next ) => {

	if ( !req.params.username ) {
		return next( errors.blankData());
	}

	User.findOne({ username: req.params.username })
		.select( "username fullname description keywords profileImage headerImage" +
							" interests friends" )
		.exec()
		.then( user => {
			if ( !user ) {
				return next( errors.userDoesntExist());
			}
			user.keywords = "#" + user.keywords.toString().replace( /,/g, " #" );
			res.send( user );
		}).catch( err => next( err ));
});

// set user info
Router.post( "/info", upload.fields([ { name: "userImage", maxCount: 1 },
	{ name: "headerImage", maxCount: 1 } ]), ( req, res, next ) => {
	var
		newInfo,
		userId;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}

	newInfo = req.body;

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
			if ( newInfo.description ) {
				user.description = newInfo.description;
			}
			if ( newInfo.fullname ) {
				user.fullname = newInfo.fullname;
			}
			if ( newInfo.username ) {
				user.username = newInfo.username;
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

// get 10 users with the same interests
Router.post( "/match", ( req, res, next ) => {

	if ( !req.body.data ) {
		return next( errors.blankData());
	}

	User.find({ interests: { $in: req.body.data } })
		.select( "username fullname description" )
		.limit( 10 )
		.exec()
		.then( users => {
			res.send( users );
		}).catch( err => next( err ));
});

// add new interests
Router.post( "/addInterests", ( req, res, next ) => {
	var
		userId,
		newInterests;

	if ( !req.body.data || !req.body.token ) {
		return next( errors.blankData());
	}

	newInterests = req.body.data;

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

			async.eachSeries( newInterests, function( newInterest, done ) {
				if ( !user.interests.includes( newInterest )) {
					user.interests.push( newInterest );
					done();
				}
			});

			user.save()
				.then(() => res.sendStatus( 201 ))
				.catch( err => next( err ));
		}).catch( err => next( err ));
});

// get one user with the same general interests
Router.post( "/sugestedUsers", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || req.body.skip === undefined ) {
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
			User.findOne({ interests: { $in: user.interests } })
				.skip( req.body.skip )
				.where( "_id" ).ne( user.id )
				.select(
					"username fullname description keywords profileImage headerImage " +
					"friends followers"
				)
				.exec()
				.then( user => {
					if ( user ) {
						user.keywords = "#" + user.keywords.toString().replace( /,/g, " #" );
					}
					res.send( user );
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

// retrieve a random user that is not the requester
Router.post( "/randomUser", ( req, res, next ) => {
	var
		userId,
		randomUser;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}

	try {
		userId = tokenVerifier( req.body.token );
	} catch ( err ) {
		return next( err );
	}

	findRandomUser( userId )
		.then( user => {
			if ( user ) {
				user.keywords = "#" + user.keywords.toString().replace( /,/g, " #" );
			}
			res.send( user );
		}).catch( err => next( err ));
});

// get one user with one or more common keywords
Router.post( "/matchKwUsers", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || !req.body.data || req.body.skip === undefined ) {
		return next( errors.blankData());
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
			"username fullname description keywords profileImage headerImage " +
			"friends followers"
		)
		.exec()
		.then( user => {
			if ( user ) {
				user.keywords = "#" + user.keywords.toString().replace( /,/g, " #" );
			}
			res.send( user );
		}).catch( err => next( err ));
});

// set the user keywords
Router.post( "/setUserKw", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || !req.body.data ) {
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
			user.keywords = req.body.data;
			user.save()
				.then(() => res.sendStatus( 201 ))
				.catch( err => next( err ));
		}).catch( err => next( err ));
});


Router.post( "/getChats", async( req, res, next ) => {
	var
		userId,
		user = {};

	if ( !req.body.token ) {
		return next( errors.blankData());
	}

	try {
		userId = await tokenVerifier( req.body.token );
		user = await User.findById( userId )
			.populate({
				path: "openConversations",
				populate: {
					path: "author target messages",
					select: "fullname username profileImage author receiver content" +
					" createdAt",
					options: {
						sort: { createdAt: -1 }
					}
				}
			})
			.select( "openConversations" )
			.exec();
	} catch ( err ) {
		return next( err );
	}

	if ( !user ) {
		return next( errors.userDoesntExist());
	}

	res.send( user.openConversations );
});


Router.post( "/getSocialCircle", ( req, res, next ) => {
	var
		userId,
		socialCircle = [];

	if ( !req.body.token ) {
		return next( errors.blankData());
	}

	try {
		userId = tokenVerifier( req.body.token );
	} catch ( err ) {
		return next( err );
	}

	User.findById( userId )
		.populate( "friends followers following", "username fullname profileImage" )
		.select( "friends followers following" )
		.exec()
		.then( user => {
			if ( !user ) {
				return next( errors.userDoesntExist());
			}

			socialCircle = socialCircle.concat(
				user.friends, user.following, user.followers
			);

			socialCircle = removeDuplicates( socialCircle, "username" );

			res.send( socialCircle );
		}).catch( err => next( err ));
});

module.exports = Router;
