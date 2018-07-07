const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	Ticket = require( "../models/Ticket" ),
	bcrypt = require( "bcrypt" ),
	multer = require( "multer" ),
	upload = multer({ dest: "../wanamic-frontend/src/images" }),
	findRandomUser = require( "../utils/findRandomUser" ),
	removeDuplicates = require( "../utils/removeDuplicatesArrOfObj" ),
	validateEmail = require( "../utils/validateEmail" ),
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
	{ name: "headerImage", maxCount: 1 } ]), async( req, res, next ) => {
	var
		newInfo,
		user,
		userId;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}

	newInfo = req.body;

	try {
		userId = await tokenVerifier( req.body.token );
		user = await User.findById( userId ).exec();
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
			const userWithUsername = await User.findOne({
				username: newInfo.username
			}).exec();
			if ( userWithUsername ) {
				return next( errors.registeredUsername());
			}
			user.username = newInfo.username;
		}
		if ( req.files && req.files[ "userImage" ]) {
			user.profileImage = req.files[ "userImage" ][ 0 ].filename;
		}
		if ( req.files && req.files[ "headerImage" ]) {
			user.headerImage = req.files[ "headerImage" ][ 0 ].filename;
		}
		await user.save();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 201 );
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
Router.post( "/updateInterests", async( req, res, next ) => {
	var
		userId,
		user;

	if ( !req.body.newInterests || !req.body.token ) {
		return next( errors.blankData());
	}
	const { newInterests, token } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		user.interests = newInterests;
		await user.save();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 201 );
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
					" createdAt"
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


Router.patch( "/updatePassword", async( req, res, next ) => {
	var
		userId,
		user,
		isValid;

	if ( !req.body.token || !req.body.currentPassword ||
			!req.body.newPassword ) {
		return next( errors.blankData());
	}
	const { token, currentPassword, newPassword } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		isValid = await user.isValidPassword( currentPassword );
		if ( !isValid ) {
			return next( errors.invalidPassword());
		}
		user.passwordHash = await bcrypt.hashSync( newPassword, 10 );
		user.save();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 201 );
});


Router.patch( "/updateEmail", async( req, res, next ) => {
	var
		userId,
		user;

	if ( !req.body.token || !req.body.currentEmail ||
			!req.body.newEmail ) {
		return next( errors.blankData());
	}

	const { token, currentEmail, newEmail } = req.body;

	if ( !validateEmail( newEmail )) {
		return next( errors.invalidEmailFormat());
	}

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( user.email !== currentEmail ) {
			return next( errors.invalidEmail());
		}
		userWithNewEmail = await User.findOne({ email: newEmail }).exec();
		if ( userWithNewEmail ) {
			return next( errors.registeredEmail());
		}
		user.email = newEmail;
		user.save();
	} catch ( err ) {
		return next( err );
	}

	res.sendStatus( 201 );
});


Router.delete( "/deleteAccount", async( req, res, next ) => {
	var
		userId,
		user,
		isValid;

	if ( !req.body.token || !req.body.password ) {
		return next( errors.blankData());
	}
	const { token, password } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		isValid = await user.isValidPassword( password );
		if ( !isValid ) {
			return next( errors.invalidPassword());
		}
		if ( req.body.feedback ) {
			await new Ticket({
				author: user.username,
				content: req.body.feedback,
				fromDeletedAccount: true
			}).save();
		}
		await user.remove();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


module.exports = Router;
