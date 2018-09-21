const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	Ticket = require( "../models/Ticket" ),
	bcrypt = require( "bcrypt" ),
	aws = require( "aws-sdk" ),
	multer = require( "multer" ),
	multerS3 = require( "multer-s3" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	findRandomUser = require( "../utils/findRandomUser" ),
	removeDuplicates = require( "../utils/removeDuplicatesArrOfObj" ),
	validators = require( "../utils/validators" ),
	errors = require( "../utils/errors" ),
	removeImage = require( "../utils/removeImage" ),
	path = require( "path" );

let
	s3 = new aws.S3({
		accessKeyId: process.env.ACCESS_KEY_ID,
		secretAccessKey: process.env.SECRET_ACCESS_KEY,
		Bucket: "wanamic.com"
	}),
	upload = process.env.NODE_ENV === "dev" ?
		multer({
			dest: "../wanamic-frontend/src/images",
			fileFilter: function( req, file, callback ) {
				var ext = path.extname( file.originalname );
				if (( file.mimetype !== "image/jpeg" && file.mimetype !== "image/png"
					&& file.mimetype !== "image/jpg" && file.mimetype !== "image/gif" )) {
					return callback( new Error(
						"Only .png .jpg .gif .jpeg images are allowed" ));
				}
				callback( null, true );
			},
			limits: {
				fileSize: 1010000
			}
		})
		:
		multer({
			storage: multerS3({
				s3: s3,
				bucket: "wanamic.com",
				metadata: function( req, file, cb ) {
					cb( null, { fieldName: file.fieldname });
				},
				key: function( req, file, cb ) {
					cb( null, Date.now().toString());
				}
			}),
			fileFilter: function( req, file, callback ) {
				var ext = path.extname( file.originalname );
				if (( file.mimetype !== "image/jpeg" && file.mimetype !== "image/png"
					&& file.mimetype !== "image/jpg" && file.mimetype !== "image/gif" )) {
					return callback( new Error(
						"Only .png .jpg .gif .jpeg images are allowed" ));
				}
				callback( null, true );
			},
			limits: {
				fileSize: 1010000
			}
		}),
	filenameProp = process.env.NODE_ENV === "dev" ?
		"filename" : "key";


Router.post( "/userInfo", async( req, res, next ) => {
	var
		requesterId,
		requester,
		user;

	if ( !req.body.username ) {
		return next( errors.blankData());
	}
	const { username, token } = req.body;

	try {
		user = await User.findOne({ username: username })
			.select( "username fullname description hobbies profileImage" +
								" headerImage interests friends gender" +
								" birthday totalLikes totalViews country region" )
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( token ) {
			requesterId = tokenVerifier( token );
			requester = await User.findById( requesterId ).exec();
			if ( user.username !== requester.username ) {
				user.totalViews++;
				await user.save();
			}
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
		user,
		userId;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}
	const {
		token, description, fullname, username, country, region, gender,
		birthday
	} = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( description !== "undefined" && description !== user.description ) {
			user.description = description;
		}
		if ( fullname && fullname !== user.fullname &&
			validators.validateFullname( fullname )) {
			user.fullname = fullname;
		}
		if ( username && username !== user.username &&
			validators.validateUsername( username )) {

			const userWithUsername = await User.findOne({
				username: username
			}).exec();
			if ( userWithUsername ) {
				return next( errors.registeredUsername());
			}
			user.username = username;
		}
		if ( country !== "undefined" && country !== user.country ) {
			user.country = country;
		}
		if ( region !== "undefined" && region !== user.region ) {
			user.region = region;
		}
		if ( gender !== "undefined" && gender !== user.gender ) {
			user.gender = gender;
		}
		if ( birthday !== "undefined" && birthday !== user.birthday ) {
			user.birthday = birthday;
		}
		if ( req.files && req.files[ "userImage" ]) {
			if ( user.profileImage ) {
				removeImage( user.profileImage );
			}
			user.profileImage = req.files[ "userImage" ][ 0 ][ filenameProp ];
		}
		if ( req.files && req.files[ "headerImage" ]) {
			if ( user.headerImage ) {
				removeImage( user.headerImage );
			}
			user.headerImage = req.files[ "headerImage" ][ 0 ][ filenameProp ];
		}
		await user.save();
		res.status( 201 );
		res.send({ newImage: user.profileImage, newUsername: user.username });
	} catch ( err ) {
		return next( err );
	}
});


Router.post( "/match", async( req, res, next ) => {
	let users;
	if ( !req.body.data ) {
		return next( errors.blankData());
	}
	try {
		users = await User.find({ interests: { $in: req.body.data } })
			.select( "username fullname description hobbies profileImage" )
			.limit( 10 )
			.exec();
	} catch ( err ) {
		return next( err );
	}
	res.send( users );
});


Router.post( "/updateInterests", async( req, res, next ) => {
	var
		userId,
		user;

	if ( !req.body.newInterests || !req.body.token ) {
		return next( errors.blankData());
	}
	const { newInterests, token } = req.body;

	try {
		userId = tokenVerifier( token );
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


Router.post( "/suggestedUsers", async( req, res, next ) => {
	var
		userId,
		user,
		sugestedUser;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}
	try {
		userId = tokenVerifier( req.body.token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		[ sugestedUser ] = await User.aggregate()
			.match({
				interests: { $in: user.interests },
				"_id": { $ne: user.id }
			})
			.project(
				"username fullname description hobbies profileImage headerImage " +
				"friends totalLikes"
			)
			.sample( 1 )
			.exec();
	} catch ( err ) {
		return next( err );
	}
	res.send( sugestedUser );
});


Router.post( "/suggestedUserChat", async( req, res, next ) => {
	var
		userId,
		user,
		sugestedUser,
		openConversations = [];

	if ( !req.body.token ) {
		return next( errors.blankData());
	}
	try {
		userId = tokenVerifier( req.body.token );
		user = await User.findById( userId )
			.populate( "openConversations" )
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		for ( const conversation of user.openConversations ) {
			openConversations.push( conversation.target );
		}
		[ sugestedUser ] = await User.aggregate()
			.match({
				interests: { $in: user.interests },
				"_id": { $ne: user._id, $nin: openConversations }
			})
			.project(
				"username fullname description hobbies profileImage headerImage " +
				"friends totalLikes"
			)
			.sample( 1 )
			.exec();
	} catch ( err ) {
		return next( err );
	}
	res.send( sugestedUser );
});


Router.post( "/randomUser", async( req, res, next ) => {
	var
		userId,
		randomUser;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}
	try {
		userId = tokenVerifier( req.body.token );
		randomUser = await findRandomUser( userId, req.body.exposition );
		res.send( randomUser );
	} catch ( err ) {
		return next( err );
	}
});


Router.post( "/matchHobbies", async( req, res, next ) => {
	var
		userId,
		user;

	if ( !req.body.token || !req.body.data || req.body.skip === undefined ) {
		return next( errors.blankData());
	}
	try {
		userId = tokenVerifier( req.body.token );
		const searchRegex = new RegExp( req.body.data );
		user = await User.findOne({ "hobbies": { $regex: searchRegex, $options: "i" } })
			.skip( req.body.skip )
			.where( "_id" ).ne( userId )
			.select(
				"username fullname description hobbies profileImage headerImage " +
				"friends"
			)
			.exec();
	} catch ( err ) {
		return next( err );
	}
	res.send( user );
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
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		for ( const hobbie of data ) {
			newHobbies.push( hobbie.text );
		}
		user.hobbies = newHobbies;
		await user.save();
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
		userId = tokenVerifier( req.body.token );
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
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
	} catch ( err ) {
		return next( err );
	}
	res.send( user.openConversations );
});


Router.post( "/getSocialCircle", async( req, res, next ) => {
	var
		userId,
		user;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}
	try {
		userId = tokenVerifier( req.body.token );
		user = await User.findById( userId )
			.populate({
				path: "friends",
				select: "username fullname profileImage"
			})
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		res.send( user.friends );
	} catch ( err ) {
		return next( err );
	}
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
		if ( !validators.validatePassword( newPassword )) {
			return next( errors.invalidPasswordFormat());
		}
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		isValid = await user.isValidPassword( currentPassword );
		if ( !isValid ) {
			return next( errors.invalidPassword());
		}
		user.passwordHash = await bcrypt.hashSync( newPassword, 10 );
		await user.save();
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

	try {
		if ( !validators.validateEmail( newEmail )) {
			return next( errors.invalidEmailFormat());
		}
		userId = tokenVerifier( token );
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
		await user.save();
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
		userId = tokenVerifier( token );
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
				author: user._id,
				content: req.body.feedback,
				deleteFeedback: true
			}).save();
		}
		await user.remove();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


Router.post( "/getUserAlbum", async( req, res, next ) => {
	var
		user;

	if ( !req.body.username ) {
		return next( errors.blankData());
	}
	const { username } = req.body;

	try {
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
	} catch ( err ) {
		return next( err );
	}
	res.send( user.posts );
});


Router.post( "/getUserNetwork", async( req, res, next ) => {
	var
		user;

	if ( !req.body.username ) {
		return next( errors.blankData());
	}
	const { username } = req.body;

	try {
		user = await User.findOne({ username: username })
			.populate({
				path: "friends",
				select: "username fullname profileImage description hobbies"
			})
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
	} catch ( err ) {
		return next( err );
	}
	res.send( user.friends );
});


Router.post( "/getLikesAndViews", async( req, res, next ) => {
	var
		userId,
		user;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}
	try {
		userId = tokenVerifier( req.body.token );
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


Router.post( "/clubs", async( req, res, next ) => {
	var
		userId,
		user;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}
	try {
		userId = tokenVerifier( req.body.token );
		user = await User.findById( userId )
			.populate({
				path: "clubs",
				populate: {
					path: "president",
					select: "username fullname"
				}
			})
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
	} catch ( err ) {
		return next( err );
	}
	res.send( user.clubs );
});


Router.post( "/feedback", async( req, res, next ) => {
	var
		userId,
		user;

	if ( !req.body.token || !req.body.content ) {
		return next( errors.blankData());
	}
	const { token, content } = req.body;
	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		await new Ticket({
			author: user._id,
			content: `Feedback: ${content}`,
			type: "feedback"
		}).save();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 201 );
});


module.exports = Router;
