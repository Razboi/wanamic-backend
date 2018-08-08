const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	Notification = require( "../models/Notification" ),
	errors = require( "../utils/errors" );

// change name
Router.post( "/getFriends", async( req, res, next ) => {
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
				path: "friends following",
				options: {
					select: "username fullname profileImage",
					sort: { createdAt: -1 }
				}
			})
			.select( "friends following" )
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
	} catch ( err ) {
		return next( err );
	}
	res.send([ ...user.friends, ...user.following ]);
});


Router.post( "/add", async( req, res, next ) => {
	var
		userId,
		user,
		friend,
		duplicatedNotification,
		newNotification;

	if ( !req.body.token || !req.body.friendUsername ) {
		return next( errors.blankData());
	}
	const { token, friendUsername } = req.body;
	try {
		userId = tokenVerifier( token );
		user = User.findById( userId )
			.select( "username fullname profileImage friends pendingRequests" )
			.exec();
		friend = User.findOne({ username: req.body.friendUsername }).exec();
		[ user, friend ] = await Promise.all([ user, friend ]);
		if ( !user || !friend ) {
			return next( errors.userDoesntExist());
		}
		if ( user.username === req.body.friendUsername ) {
			return next( errors.blankData());
		}
		if ( user.friends.some( id => friend._id.equals( id )) ||
				friend.friends.some( id => user._id.equals( id ))) {
			return next( errors.alreadyRelated());
		}
		duplicatedNotification = await Notification.findOne({
			author: user._id,
			receiver: friend._id,
			friendRequest: true
		})
			.exec();
		if ( duplicatedNotification ) {
			return next( errors.duplicatedNotification());
		}
		newNotification = await new Notification({
			author: user._id,
			receiver: friend._id,
			content: "sent you a friend request",
			friendRequest: true
		}).save();
		newNotification.author = user;
		user.pendingRequests.push( friend.username );
		friend.notifications.push( newNotification );
		friend.newNotifications++;
		Promise.all([ user.save(), friend.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.status( 201 );
	res.send( newNotification );
});


Router.delete( "/delete", async( req, res, next ) => {
	var
		userId,
		user,
		friend;

	if ( !req.body.token || !req.body.friendUsername ) {
		return next( errors.blankData());
	}
	const { token, friendUsername } = req.body;

	try {
		userId = tokenVerifier( req.body.token );
		user = User.findById( userId ).exec();
		friend = User.findOne({ username: friendUsername }).exec();
		[ user, friend ] = await Promise.all([ user, friend ]);
		if ( !user || !friend ) {
			return next( errors.userDoesntExist());
		}
		const
			friendIndex = user.friends.indexOf( friend._id ),
			userIndex = friend.friends.indexOf( user._id );
		user.friends.splice( friendIndex, 1 );
		friend.friends.splice( userIndex, 1 );
		Promise.all([ user.save(), friend.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


Router.post( "/isRequested", async( req, res, next ) => {
	var
		userId,
		user,
		target,
		userRequested,
		targetRequested;

	if ( !req.body.token || !req.body.targetUsername ) {
		return next( errors.blankData());
	}
	const { token, targetUsername } = req.body;

	try {
		userId = tokenVerifier( req.body.token );
		user = User.findById( userId ).exec();
		target = User.findOne({ username: targetUsername }).exec();
		[ user, target ] = await Promise.all([ user, target ]);
		if ( !user || !target ) {
			return next( errors.userDoesntExist());
		}
		userRequested = user.pendingRequests.includes( target.username );
		targetRequested = target.pendingRequests.includes( user.username );
	} catch ( err ) {
		return next( err );
	}
	res.send({ user: userRequested, target: targetRequested });
});


Router.post( "/accept", async( req, res, next ) => {
	var
		userId,
		user,
		friend;

	if ( !req.body.token || !req.body.friendUsername ) {
		return next( errors.blankData());
	}
	const { token, friendUsername } = req.body;

	try {
		userId = tokenVerifier( token );
		user = User.findById( userId ).exec();
		friend = User.findOne({ username: friendUsername }).exec();
		[ user, friend ] = await Promise.all([ user, friend ]);
		if ( !user || !friend ) {
			return next( errors.userDoesntExist());
		}
		const notification = await Notification.findOne({
			receiver: user._id,
			author: friend._id,
			friendRequest: true
		}).exec();
		if ( !notification ) {
			return next( errors.notificationDoesntExist());
		}
		if ( user.friends.some( id => friend._id.equals( id )) ||
				friend.friends.some( id => user._id.equals( id ))) {
			return next( errors.alreadyRelated());
		}
		user.friends.push( friend._id );
		friend.friends.push( user._id );

		// Unfollow
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
		Promise.all([ user.save(), friend.save(), notification.remove() ]);
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 201 );
});


module.exports = Router;
