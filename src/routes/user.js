const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	Post = require( "../models/Post" ),
	Comment = require( "../models/Comment" ),
	Conversation = require( "../models/Conversation" ),
	Notification = require( "../models/Notification" ),
	Message = require( "../models/Message" ),
	Ticket = require( "../models/Ticket" ),
	bcrypt = require( "bcrypt" ),
	multer = require( "multer" ),
	upload = multer({ dest: "../wanamic-frontend/src/images" }),
	findRandomUser = require( "../utils/findRandomUser" ),
	removeDuplicates = require( "../utils/removeDuplicatesArrOfObj" ),
	validateEmail = require( "../utils/validateEmail" ),
	async = require( "async" ),
	errors = require( "../utils/errors" ),
	fs = require( "fs" );

Router.post( "/userInfo", async( req, res, next ) => {
	var
		userId,
		requester,
		user;

	if ( !req.body.username || !req.body.token ) {
		return next( errors.blankData());
	}

	const { username, token } = req.body;

	try {
		userId = await tokenVerifier( token );
		requester = await User.findById( userId ).exec();
		user = await User.findOne({ username: username })
			.select( "username fullname description hobbies profileImage" +
								" headerImage interests friends followers location gender" +
								" birthday totalLikes totalViews" )
			.exec();
		if ( !user || !requester ) {
			return next( errors.userDoesntExist());
		}

		if ( user.username !== requester.username ) {
			user.totalViews++;
			user = await user.save();
		}
	} catch ( err ) {
		return next( err );
	}
	res.send( user );
});

// set user info
Router.post( "/info", upload.fields([ { name: "userImage", maxCount: 1 },
	{ name: "headerImage", maxCount: 1 } ]), async( req, res, next ) => {
	var
		newInfo,
		user,
		userId,
		newImage,
		newUsername;

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
		if ( newInfo.description && newInfo.description !== user.description ) {
			user.description = newInfo.description;
		}
		if ( newInfo.fullname && newInfo.fullname !== user.fullname ) {
			user.fullname = newInfo.fullname;
		}
		if ( newInfo.location && newInfo.location !== user.location ) {
			user.location = newInfo.location;
		}
		if ( newInfo.gender && newInfo.gender !== user.gender ) {
			user.gender = newInfo.gender;
		}
		if ( newInfo.birthday && newInfo.birthday !== user.birthday ) {
			user.birthday = newInfo.birthday;
		}
		if ( newInfo.username && newInfo.username !== user.username ) {
			const userWithUsername = await User.findOne({
				username: newInfo.username
			}).exec();
			if ( userWithUsername ) {
				return next( errors.registeredUsername());
			}
			user.username = newInfo.username;
			newUsername = newInfo.username;
		}
		if ( req.files ) {
			if ( req.files[ "userImage" ]) {
				const
					oldPicPath = "../wanamic-frontend/src/images/",
					oldPicFile = user.profileImage;
				user.profileImage = req.files[ "userImage" ][ 0 ].filename;
				newImage = req.files[ "userImage" ][ 0 ].filename;
				fs.unlink( oldPicPath + oldPicFile, err => {
					if ( err ) {
						next( err );
					}
				});
			}
			if ( req.files[ "headerImage" ]) {
				const
					oldPicPath = "../wanamic-frontend/src/images/",
					oldPicFile = user.headerImage;
				user.headerImage = req.files[ "headerImage" ][ 0 ].filename;
				fs.unlink( oldPicPath + oldPicFile, err => {
					if ( err ) {
						next( err );
					}
				});
			}
		}
		await user.save();
	} catch ( err ) {
		return next( err );
	}
	res.status( 201 );
	res.send({ newImage: newImage, newUsername: newUsername });
});

// get 10 users with the same interests
Router.post( "/match", ( req, res, next ) => {

	if ( !req.body.data ) {
		return next( errors.blankData());
	}

	User.find({ interests: { $in: req.body.data } })
		.select( "username fullname description hobbies profileImage" )
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
					"username fullname description hobbies profileImage headerImage " +
					"friends followers totalLikes"
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
			res.send( user );
		}).catch( err => next( err ));
});


Router.post( "/matchHobbies", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || !req.body.data || req.body.skip === undefined ) {
		return next( errors.blankData());
	}

	try {
		userId = tokenVerifier( req.body.token );
	} catch ( err ) {
		return next( err );
	}
	const searchRegex = new RegExp( req.body.data );

	User.findOne({ "hobbies": { $regex: searchRegex, $options: "i" } })
		.skip( req.body.skip )
		.where( "_id" ).ne( userId )
		.select(
			"username fullname description hobbies profileImage headerImage " +
			"friends followers"
		)
		.exec()
		.then( user => {
			res.send( user );
		}).catch( err => next( err ));
});


Router.post( "/setUserKw", async( req, res, next ) => {
	var
		userId,
		user,
		newHobbies = [];

	if ( !req.body.token || !req.body.data ) {
		return next( errors.blankData());
	}

	const { token, data } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		for ( const hobbie of data ) {
			newHobbies.push( hobbie.text );
		}
		user.hobbies = newHobbies;
		user.save();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 201 );
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
					select: "fullname username profileImage content createdAt",
					populate: {
						path: "author receiver",
						select: "fullname username profileImage"
					}
				},
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
			new Ticket({
				author: user._id,
				content: req.body.feedback,
				fromDeletedAccount: true
			}).save();
		}

		User.update(
			{ _id: { $in: [ user.friends, user.followers ] } },
			{ $pull: { "newsfeed": { $in: user.posts } } },
			{ multi: true }
		).exec();
		Notification.remove({
			_id: { $in: user.notifications }
		}).exec();
		await Comment.remove({
			post: { $in: user.posts }
		}).exec();
		await Post.remove({
			_id: { $in: user.posts }
		}).exec();

		const
			comments = await Comment.find({ author: user._id }).remove(),
			notifications = await Notification.find({ author: user._id }).remove(),
			conversations = await Conversation.find({
				$or: [ { author: user._id }, { target: user._id } ]
			}).remove(),
			messages = await Message.find({
				$or: [ { author: user._id }, { receiver: user._id } ]
			}).remove();
		user.remove();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


Router.post( "/getUserAlbum", async( req, res, next ) => {
	var
		visitorId,
		user,
		relationLevel,
		filteredPosts = [];

	if ( !req.body.token || !req.body.username ) {
		return next( errors.blankData());
	}
	const { token, username } = req.body;

	try {
		visitorId = await tokenVerifier( token );
		user = await User.findOne({ username: username })
			.populate({
				path: "posts",
				match: { picture: true },
				populate: {
					path: "author",
					select: "username fullname profileImage"
				}
			})
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( user.friends.some( id => id.equals( visitorId ))
				|| user._id.equals( visitorId )) {
			relationLevel = 1;
		} else if ( user.followers.some( id => id.equals( visitorId ))) {
			relationLevel = 2;
		} else {
			relationLevel = 3;
		}
		filteredPosts = await user.posts.filter( post =>
			post.privacyRange >= relationLevel );
	} catch ( err ) {
		return next( err );
	}
	res.send( filteredPosts );
});


Router.post( "/getUserNetwork", async( req, res, next ) => {
	var
		requesterId,
		requester,
		user;

	if ( !req.body.token || !req.body.username ) {
		return next( errors.blankData());
	}
	const { token, username } = req.body;

	try {
		requesterId = await tokenVerifier( token );
		requester = await User.findById( requesterId ).exec();
		user = await User.findOne({ username: username })
			.populate({
				path: "friends followers following",
				select: "username fullname profileImage description hobbies"
			})
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
	} catch ( err ) {
		return next( err );
	}
	res.send({
		user: {
			friends: user.friends,
			followers: user.followers,
			following: user.following
		},
		requester: {
			friends: requester.friends,
			following: requester.following
		}
	});
});


Router.post( "/getLikesAndViews", async( req, res, next ) => {
	var
		userId,
		user;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}
	const { token } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId )
			.select( "totalLikes totalViews " )
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
	} catch ( err ) {
		return next( err );
	}
	res.send( user );
});


module.exports = Router;
