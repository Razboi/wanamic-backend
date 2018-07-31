const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	errors = require( "../utils/errors" );

Router.post( "/retrieve/:skip", async( req, res, next ) => {
	var
		userId,
		user;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}
	try {
		userId = await tokenVerifier( req.body.token );
		user = await User.findById( userId )
			.populate({
				path: "notifications openConversations",
				options: {
					sort: { createdAt: -1 },
					limit: 10,
					skip: req.params.skip * 10
				},
				populate: {
					path: "author",
					select: "fullname username profileImage"
				}
			})
			.exec();
	} catch ( err ) {
		return next( err );
	}

	res.send({
		notifications: user.notifications,
		newNotifications: user.newNotifications
	});
});

Router.post( "/check", async( req, res, next ) => {
	var
		userId,
		user;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}

	const { token } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		user.newNotifications = 0;
		user.save();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});

module.exports = Router;
