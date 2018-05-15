const
	Router = require( "express" ).Router(),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../utils/tokenGenerator" ),
	User = require( "../models/User" ),
	Post = require( "../models/Post" ),
	Comment = require( "../models/Comment" ),
	Notification = require( "../models/Notification" ),
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
				newNotifications: newNotifications.length
			});
		}).catch( err => next( err ));
});

Router.post( "/check", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || !req.body.notificationId ) {
		return next( errors.blankData());
	}

	const data = req.body;

	try {
		userId = tokenVerifier( data.token );
	} catch ( err ) {
		return next( err );
	}

	Notification.findById( data.notificationId )
		.exec()
		.then( notification => {
			if ( !notification ) {
				return next( errors.notificationDoesntExist());
			}
			User.findById( userId )
				.exec()
				.then( user => {
					if ( user.username !== notification.receiver ) {
						return next( errors.unauthorized());
					}
					notification.checked = true;
					notification.save();
					res.sendStatus( 200 );
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

module.exports = Router;
