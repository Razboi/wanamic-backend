const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	async = require( "async" ),
	Notification = require( "../models/Notification" ),
	errors = require( "../utils/errors" );

Router.post( "/follow", async( req, res, next ) => {
	var
		userId,
		user,
		userToFollow,
		newNotification;

	if ( !req.body.token || !req.body.targetUsername ) {
		return next( errors.blankData());
	}

	const { token, targetUsername } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId )
			.select( "username fullname profileImage following friends" )
			.exec();
		userToFollow = await User.findOne({ username: targetUsername })
			.exec();

		if ( !user || !userToFollow ) {
			return next( errors.userDoesntExist());
		}

		if ( userToFollow.followers.some( id => user._id.equals( id )) ||
				user.following.some( id => userToFollow._id.equals( id ))) {
			return next( errors.alreadyRelated());
		}
		if ( userToFollow.friends.some( id => user._id.equals( id )) ||
				user.friends.some( id => userToFollow._id.equals( id ))) {
			return next( errors.alreadyRelated());
		}

		const alreadyNotificated = await Notification.findOne({
			author: user._id,
			receiver: userToFollow._id,
			follow: true
		}).exec();

		if ( !alreadyNotificated ) {
			newNotification = await new Notification({
				author: user._id,
				receiver: userToFollow._id,
				content: "started following you",
				follow: true
			}).save();
			newNotification.author = user;
			userToFollow.notifications.push( newNotification );
			userToFollow.newNotifications++;
		}

		user.following.push( userToFollow._id );
		userToFollow.followers.push( user._id );
		Promise.all([ userToFollow.save(), user.save() ]);

	} catch ( err ) {
		return next( err );
	}
	res.status( 201 );
	res.send( newNotification );
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
Router.post( "/setupFollow", async( req, res, next ) => {
	var
		userId,
		user,
		target,
		newNotification,
		allNotifications = [];

	if ( !req.body.token || !req.body.users ) {
		return next( errors.blankData());
	}

	try {
		userId = tokenVerifier( req.body.token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		async.eachSeries( req.body.users, async function( userToFollow, done ) {
			target = await User.findOne({ username: userToFollow }).exec();
			if ( !target ) {
				throw errors.userDoesntExist();
			}
			const alreadyNotificated = await Notification.findOne({
				author: user._id,
				receiver: target._id,
				follow: true
			}).exec();

			if ( !alreadyNotificated ) {
				newNotification = await new Notification({
					author: user._id,
					receiver: target._id,
					content: "started following you",
					follow: true
				}).save();
				newNotification.author = user;
				target.notifications.push( newNotification );
				target.newNotifications++;
				allNotifications.push( newNotification );
			}
			user.following.push( target._id );
			target.followers.push( user._id );
			await user.save();
			await target.save();
		}, err => {
			if ( err ) {
				return next( err );
			} else {
				res.status( 201 );
				res.send( allNotifications );
			}
		});
	} catch ( err ) {
		return next( err );
	}
});


module.exports = Router;
