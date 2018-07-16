const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	async = require( "async" ),
	Notification = require( "../models/Notification" ),
	errors = require( "../utils/errors" );

Router.post( "/follow", ( req, res, next ) => {
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
		.select( "username fullname profileImage following friends" )
		.exec()
		.then( user => {
			if ( !user ) {
				return next( errors.userDoesntExist());
			}
			User.findOne({ username: req.body.targetUsername })
				.exec()
				.then( userToFollow => {
					if ( !userToFollow ) {
						return next( errors.userDoesntExist());
					}

					if ( userToFollow.followers.some( id => user._id.equals( id )) ||
							user.following.some( id => userToFollow._id.equals( id ))) {
						return next( errors.blankData());
					}
					if ( userToFollow.friends.some( id => user._id.equals( id )) ||
							user.friends.some( id => userToFollow._id.equals( id ))) {
						return next( errors.blankData());
					}
					new Notification({
						author: user._id,
						receiver: userToFollow._id,
						content: "started following you",
						follow: true
					}).save()
						.then( newNotification => {
							newNotification.author = user;
							user.following.push( userToFollow._id );
							userToFollow.followers.push( user._id );
							userToFollow.notifications.push( newNotification );
							Promise.all([ userToFollow.save(), user.save() ])
								.then(() => {
									res.status( 201 );
									res.send( newNotification );

								}).catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


Router.delete( "/unfollow", ( req, res, next ) => {
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
				.then( userToUnfollow => {
					if ( !userToUnfollow ) {
						return next( errors.userDoesntExist());
					}
					const
						targetIndex = user.following.indexOf( userToUnfollow._id ),
						userIndex = userToUnfollow.followers.indexOf( user._id );
					user.following.splice( targetIndex, 1 );
					userToUnfollow.followers.splice( userIndex, 1 );
					Promise.all([ userToUnfollow.save(), user.save() ])
						.then(() => res.sendStatus( 200 ))
						.catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

// follow multiple users
Router.post( "/setupFollow", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || !req.body.users ) {
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

			async.eachSeries( req.body.users, function( userToFollow, done ) {
				User.findOne({ username: userToFollow })
					.exec()
					.then( target => {
						if ( !target ) {
							return next( errors.userDoesntExist());
						}
						user.following.push( target._id );
						target.followers.push( user._id );
						Promise.all([ user.save(), target.save() ])
							.then(() => done())
							.catch( err => next( err ));
					}).catch( err => next( err ));
			}, err => {
				if ( err ) {
					next( err );
				} else {
					res.sendStatus( 201 );
				}
			});
		}).catch( err => next( err ));
});


module.exports = Router;
