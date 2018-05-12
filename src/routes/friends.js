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
									user.pendingRequests.push( friend.username );
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

Router.post( "/isRequested", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || !req.body.targetUsername ) {
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

			User.findOne({ username: req.body.targetUsername })
				.exec()
				.then( target => {
					if ( !target ) {
						return next( errors.userDoesntExist());
					}
					res.send( target.pendingRequests.includes( user.username ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

Router.post( "/accept", ( req, res, next ) => {
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
					Notification.findOne({
						receiver: user.username,
						author: friend.username,
						friendRequest: true
					})
						.exec()
						.then( notification => {
							if ( !notification ) {
								return next( errors.notificationDoesntExist());
							}

							if ( !user.friends.includes( friend._id )) {
								user.friends.push( friend._id );
							}
							if ( !friend.friends.includes( user._id )) {
								friend.friends.push( user._id );
							}
							const requestIndex = friend.pendingRequests.indexOf( user.username );
							friend.pendingRequests.splice( requestIndex, 1 );
							Promise.all([ user.save(), friend.save() ])
								.then(() => {
									notification.remove();
									res.sendStatus( 201 );
								}).catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


Router.post( "/deleteReq", ( req, res, next ) => {
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
					Notification.findOne({
						receiver: user.username,
						author: friend.username,
						friendRequest: true
					})
						.exec()
						.then( notification => {
							if ( !notification ) {
								return next( errors.notificationDoesntExist());
							}

							notification.remove()
								.then(() => res.sendStatus( 200 ))

								.catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

module.exports = Router;
