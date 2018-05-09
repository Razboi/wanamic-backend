const
	Router = require( "express" ).Router(),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../utils/tokenGenerator" ),
	User = require( "../models/User" ),
	Post = require( "../models/Post" ),
	Comment = require( "../models/Comment" ),
	errors = require( "../utils/errors" );

Router.post( "/retrieve", ( req, res, next ) => {
	var userId;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}

	try {
		userId = tokenVerifier( req.body.token );
	} catch ( err ) {
		return next( err );
	}

	User.findById( userId )
		.populate({
			path: "notifications"
		})
		.exec()
		.then( user => {
			const newNotifications = user.notifications.filter( notification => {
				return notification.checked === false;
			});
			res.send({
				notifications: user.notifications,
				newNotifications: newNotifications
			});
		}).catch( err => next( err ));
});

module.exports = Router;
