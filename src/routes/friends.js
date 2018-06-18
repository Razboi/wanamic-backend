const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	Notification = require( "../models/Notification" ),
	errors = require( "../utils/errors" );


Router.post( "/getFriends", ( req, res, next ) => {
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
			path: "friends",
			options: {
				select: "username",
				sort: { createdAt: -1 }
			}
		})
		.select( "friends" )
		.exec()
		.then( user => {
			if ( !user ) {
				return next( errors.userDoesntExist());
			}
			res.send( user.friends );
		}).catch( err => next( err ));
});

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
					if ( user.friends.some( id => friend._id.equals( id )) ||
							friend.friends.some( id => user._id.equals( id ))) {
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
										.then(() => {
											res.status( 201 );
											res.send( newNotification );

										}).catch( err => next( err ));
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

							if ( user.friends.some( id => friend._id.equals( id )) ||
									friend.friends.some( id => user._id.equals( id ))) {
								return next( errors.blankData());
							}

							user.friends.push( friend._id );
							friend.friends.push( user._id );

							if ( friend.following.some( id => user._id.equals( id ))) {
								const
									indexUser = friend.following.indexOf( user._id ),
									indexFriend = user.followers.indexOf( friend._id );

								friend.following.splice( indexUser, 1 );
								user.followers.splice( indexFriend, 1 );
							}
							if ( user.following.some( id => friend._id.equals( id ))) {
								const
									indexFriend = user.following.indexOf( friend._id ),
									indexUser = friend.followers.indexOf( user._id );

								user.following.splice( indexFriend, 1 );
								friend.followers.splice( indexUser, 1 );
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


Router.delete( "/deleteReq", ( req, res, next ) => {
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
