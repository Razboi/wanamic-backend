const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	Notification = require( "../models/Notification" ),
	nodemailer = require( "nodemailer" ),
	Email = require( "email-templates" ),
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
		userId = tokenVerifier( token );
		user = User.findById( userId )
			.select( "username fullname profileImage following friends" )
			.exec();
		userToFollow = User.findOne({ username: targetUsername }).exec();
		[ user, userToFollow ] = await Promise.all([ user, userToFollow ]);
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

			const
				email = new Email(),
				html = await email.render( "follow_notification", {
					name: userToFollow.fullname.split( " " )[ 0 ],
					follower: user.fullname
				});
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
					to: userToFollow.email,
					subject: "New follower",
					html: html
				};
			transporter.sendMail( mailOptions )
				.catch( err => {
					throw err;
				});
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


Router.delete( "/unfollow", async( req, res, next ) => {
	var
		userId,
		user,
		userToUnfollow;

	if ( !req.body.token || !req.body.targetUsername ) {
		return next( errors.blankData());
	}
	const { token, targetUsername } = req.body;

	try {
		userId = tokenVerifier( token );
		user = User.findById( userId ).exec();
		userToUnfollow = User.findOne({ username: targetUsername }).exec();
		[ user, userToUnfollow ] = await Promise.all([ user, userToUnfollow ]);
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !userToUnfollow ) {
			return next( errors.userDoesntExist());
		}
		const
			targetIndex = user.following.indexOf( userToUnfollow._id ),
			userIndex = userToUnfollow.followers.indexOf( user._id );
		user.following.splice( targetIndex, 1 );
		userToUnfollow.followers.splice( userIndex, 1 );
		Promise.all([ userToUnfollow.save(), user.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});

// follow multiple users
Router.post( "/setupFollow", async( req, res, next ) => {
	var
		userId,
		user,
		target,
		newNotification,
		allNotifications = [],
		i,
		addedPosts;

	if ( !req.body.token || !req.body.users ) {
		return next( errors.blankData());
	}
	const { token, users } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}

		for ( let userToFollow of users ) {
			target = await User.findOne({ username: userToFollow })
				.populate( "posts" )
				.exec();
			if ( !target ) {
				return next( errors.userDoesntExist());
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

			if ( target.posts.length > 0 ) {
				addedPosts = 0;
				for ( const post of target.posts ) {
					if ( addedPosts >= 5 ) {
						break;
					} else if ( post.privacyRange >= 2 && !user.newsfeed.includes( post._id )) {
						user.newsfeed.push( post._id );
						addedPosts++;
					}
				}
			}
			Promise.all([ user.save(), target.save() ]);
		}
		res.status( 201 );
		res.send( allNotifications );
	} catch ( err ) {
		return next( err );
	}
});


module.exports = Router;
