const
	Router = require( "express" ).Router(),
	dotenv = require( "dotenv" ),
	bcrypt = require( "bcrypt" ),
	jwt = require( "jsonwebtoken" ),
	tokenGenerator = require( "../utils/tokenGenerator" ),
	refreshTokenGenerator = require( "../utils/refreshTokenGenerator" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	User = require( "../models/User" ),
	errors = require( "../utils/errors" ),
	nodemailer = require( "nodemailer" ),
	validators = require( "../utils/validators" );

dotenv.config();

Router.post( "/signup", async( req, res, next ) => {
	var user;
	const credentials = req.body.credentials;

	if ( !credentials || !credentials.email || !credentials.password ||
			!credentials.username || !credentials.fullname ) {
		return next( errors.blankData());
	}
	try {
		if ( !validators.validateEmail( credentials.email )) {
			return next( errors.invalidEmailFormat());
		}
		if ( !validators.validatePassword( credentials.password )) {
			return next( errors.invalidPasswordFormat());
		}
		if ( !validators.validateUsername( credentials.username )) {
			return next( errors.invalidUsernameFormat());
		}
		if ( !validators.validateFullname( credentials.fullname )) {
			return next( errors.invalidFullnameFormat());
		}
		let
			existingUsername = User.findOne({ username: credentials.username }).exec(),
			existingEmail = User.findOne({ email: credentials.email }).exec();
		[ existingUsername, existingEmail ] =
			await Promise.all([ existingUsername, existingEmail ]);
		if ( existingUsername ) {
			return next( errors.registeredUsername());
		}
		if ( existingEmail ) {
			return next( errors.registeredEmail());
		}
		user = await new User({
			email: credentials.email,
			username: credentials.username,
			fullname: credentials.fullname,
			passwordHash: bcrypt.hashSync( credentials.password, 10 )
		}).save();
		res.status( 201 );
		res.send({
			token: tokenGenerator( user ),
			refreshToken: await refreshTokenGenerator( user ),
			profileImage: user.profileImage && user.profileImage,
			username: user.username,
			id: user._id
		});
	} catch ( err ) {
		return next( err );
	}
});


Router.post( "/login", async( req, res, next ) => {
	var user;
	const credentials = req.body.credentials;

	if ( !credentials || !credentials.email || !credentials.password ) {
		return next( errors.blankData());
	}
	try {
		user = await User.findOne({ email: credentials.email }).exec();
		if ( !user ) {
			return next( errors.invalidEmail());
		}
		if ( !user.isValidPassword( credentials.password )) {
			return next( errors.invalidPassword());
		}
		res.send({
			token: tokenGenerator( user ),
			refreshToken: user.refreshToken,
			profileImage: user.profileImage && user.profileImage,
			username: user.username,
			fullname: user.fullname,
			id: user._id
		});
	} catch ( err ) {
		return next( err );
	}
});


Router.post( "/verify", ( req, res, next ) => {
	var userId;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}
	try {
		userId = tokenVerifier( req.body.token );
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


Router.post( "/token", async( req, res, next ) => {
	var
		data,
		user;

	if ( !req.body.refreshToken ) {
		return next( errors.blankData());
	}
	try {
		data = jwt.verify( req.body.refreshToken, process.env.SECRET_REFRESH );
		user = await User.findById( data.id ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( user.refreshToken !== req.body.refreshToken ) {
			return next( errors.unauthorized());
		}
		res.status( 201 );
		res.send({ token: tokenGenerator( user ) });
	} catch ( err ) {
		return next( err );
	}
});


Router.post( "/refreshToken", async( req, res, next ) => {
	var
		userId,
		user;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}
	try {
		userId = tokenVerifier( req.body.token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		res.status( 201 );
		res.send({ refreshToken: await refreshTokenGenerator( user ) });
	} catch ( err ) {
		return next( err );
	}
});


Router.post( "/resetPassword", async( req, res, next ) => {
	var user;

	if ( !req.body.email ) {
		return next( errors.blankData());
	}
	try {
		user = await User.findOne({ email: req.body.email }).exec();
		token = tokenGenerator( user, true );
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		let transporter = nodemailer.createTransport({
			service: "gmail",
			auth: {
				user: process.env.EMAIL_ADDRESS,
				pass: process.env.EMAIL_PASSWORD
			}
		});
		const
			mailOptions = {
				from: `Wanamic ${process.env.EMAIL_ADDRESS}`,
				to: "recatala.marc@gmail.com",
				subject: "Password reset",
				html: `<h4>Hi ${user.fullname.split( " " )[ 0 ]},</h4>` +
					"<p>Someone requested a password reset for your account." +
					"If you didn't make this request, just ignore this email." +
					"Otherwise, you can reset your password using this link:</p>\n" +
					`http://localhost:3000/reset_password/${token}`
			};
		await transporter.sendMail( mailOptions );
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 201 );
});


Router.post( "/setNewPassword", async( req, res, next ) => {
	var
		data,
		user;

	if ( !req.body.token || !req.body.newPassword ) {
		return next( errors.blankData());
	}
	const { token, newPassword } = req.body;
	try {
		data = jwt.verify( req.body.token, process.env.SECRET_EMAIL );
		user = await User.findById( data.id ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !validators.validatePassword( newPassword )) {
			return next( errors.invalidPasswordFormat());
		}
		user.passwordHash = await bcrypt.hashSync( newPassword, 10 );
		await user.save();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


module.exports = Router;
