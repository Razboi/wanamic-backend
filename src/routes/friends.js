const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	Notification = require( "../models/Notification" ),
	errors = require( "../utils/errors" );


Router.post( "/add", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || !req.body.friendUsername ) {
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
			if ( user.username === req.body.friendUsername ) {
				return next( errors.blankData());
			}

			User.findOne({ username: req.body.friendUsername })
				.exec()
				.then( friend => {
					if ( !friend ) {
						return next( errors.userDoesntExist());
					}
					// check if already are friends
					if ( user.friends.some( f => friend._id.equals( f )) ||
							friend.friends.some( f => user._id.equals( f ))) {
						return next( errors.blankData());
					}

					Notification.findOne({
						author: user.username,
						receiver: friend.username,
						friendRequest: true
					})
						.exec()
						.then( duplicatedNotification => {
							if ( duplicatedNotification ) {
								return next( errors.duplicatedNotification());
							}

							new Notification({
								author: user.username,
								receiver: friend.username,
								content: "sent you a friend request",
								friendRequest: true
							}).save()
								.then( newNotification => {
									friend.notifications.push( newNotification );
									Promise.all([ user.save(), friend.save() ])
										.then(() => res.sendStatus( 201 ))
										.catch( err => next( err ));

								}).catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


// Delete friend
Router.delete( "/delete", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || !req.body.friendUsername ) {
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
			User.findOne({ username: req.body.friendUsername })
				.exec()
				.then( friend => {
					if ( !friend ) {
						return next( errors.userDoesntExist());
					}
					const
						friendIndex = user.friends.indexOf( friend._id ),
						userIndex = friend.friends.indexOf( user._id );
					user.friends.splice( friendIndex, 1 );
					friend.friends.splice( userIndex, 1 );
					Promise.all([ user.save(), friend.save() ])
						.then(() => res.sendStatus( 200 ))
						.catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

Router.post( "/accept", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || !req.body.friendUsername || !req.body.notificationId ) {
		return next( errors.blankData());
	}

	try {
		userId = tokenVerifier( req.body.token );
	} catch ( err ) {
		return next( err );
	}

	Notification.findById( req.body.notificationId )
		.exec()
		.then( notification => {
			if ( !notification ) {
				return next( errors.notificationDoesntExist());
			}

			User.findById( userId )
				.exec()
				.then( user => {
					if ( !user ) {
						return next( errors.userDoesntExist());
					}

					User.findOne({ username: req.body.friendUsername })
						.exec()
						.then( friend => {
							if ( !friend ) {
								return next( errors.userDoesntExist());
							}
							if ( notification.receiver !== user.username ||
									notification.author !== friend.username ) {
								return next( errors.unauthorized());
							}

							if ( !user.friends.includes( friend._id )) {
								user.friends.push( friend._id );
							}
							if ( !friend.friends.includes( user._id )) {
								friend.friends.push( user._id );
							}
							Promise.all([ user.save(), friend.save() ])
								.then(() => res.sendStatus( 201 ))

								.catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

module.exports = Router;
