const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	Ticket = require( "../models/Ticket" ),
	Post = require( "../models/Post" ),
	Comment = require( "../models/Comment" ),
	Notification = require( "../models/Notification" ),
	Club = require( "../models/Club" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	errors = require( "../utils/errors" ),
	sm = require( "sitemap" );

Router.post( "/adminData", async( req, res, next ) => {
	var
		userId,
		user,
		usersCount;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}

	try {
		userId = tokenVerifier( req.body.token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !user.admin ) {
			return next( errors.unauthorized());
		}
		tickets = await Ticket.find().exec();
		usersCount = await User.estimatedDocumentCount();
		lastMonthUsers = await User.find({ createdAt: {
			$gte: new Date( new Date() - 30 * 60 * 60 * 24 * 1000 )
		} }).exec();
		lastWeekUsers = await User.find({ createdAt: {
			$gte: new Date( new Date() - 7 * 60 * 60 * 24 * 1000 )
		} }).exec();
		last24Users = await User.find({ createdAt: {
			$gte: new Date( new Date() - 60 * 60 * 24 * 1000 )
		} }).exec();
	} catch ( err ) {
		return next( err );
	}
	res.send({
		usersCount: usersCount,
		lastMonthUsers: lastMonthUsers.length,
		lastWeekUsers: lastWeekUsers.length,
		last24Users: last24Users.length,
		tickets: tickets
	});
});


Router.delete( "/removeTicket", async( req, res, next ) => {
	var
		userId,
		user,
		ticket;

	if ( !req.body.token || !req.body.ticketId ) {
		return next( errors.blankData());
	}
	const { token, ticketId } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !user.admin ) {
			return next( errors.unauthorized());
		}
		ticket = await Ticket.findById( ticketId ).exec();
		await ticket.remove();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


Router.delete( "/deleteObject", async( req, res, next ) => {
	var
		userId,
		user,
		ticket,
		infractor,
		object,
		newNotification;

	if ( !req.body.token || !req.body.ticketId ) {
		return next( errors.blankData());
	}
	let { token, ticketId, feedback } = req.body;

	if ( !feedback ) {
		feedback = "violating our content policy";
	}

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !user.admin ) {
			return next( errors.unauthorized());
		}
		ticket = await Ticket.findById( ticketId ).exec();
		infractor = await User.findById( ticket.target ).exec();
		if ( ticket.type === "post" ) {
			object = await Post.findById( ticket.object ).exec();
		} else {
			object = await Comment.findById( ticket.object ).exec();
		}
		await object.remove();
		newNotification = await new Notification({
			author: user._id,
			content: `One of your ${ticket.type}s has been deleted for ${feedback}.` +
			" Avoid this kind of behavior or you will be banned.",
			receiver: infractor._id,
			alert: true
		}).save();
		infractor.infractions.push( feedback );
		infractor.notifications.push( newNotification );
		infractor.newNotifications++;
		await infractor.save();
		await ticket.remove();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


Router.post( "/banUser", async( req, res, next ) => {
	var
		userId,
		user,
		ticket,
		object,
		infractor;

	if ( !req.body.token || !req.body.ticketId ) {
		return next( errors.blankData());
	}
	let { token, ticketId, feedback } = req.body;

	if ( !feedback ) {
		feedback = "Violating our content policy";
	}

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !user.admin ) {
			return next( errors.unauthorized());
		}
		ticket = await Ticket.findById( ticketId ).exec();
		infractor = await User.findById( ticket.target ).exec();
		if ( ticket.type === "post" ) {
			object = await Post.findById( ticket.object ).exec();
		} else {
			object = await Comment.findById( ticket.object ).exec();
		}
		await object.remove();
		infractor.banned = feedback;
		await infractor.save();
		await ticket.remove();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


Router.get( "/sitemap", async( req, res, next ) => {
	let
		users = [],
		profileUrls = [],
		clubs = [],
		clubUrls = [],
		sitemap;
	try {
		users = await User.find().select( "username" ).exec();
		profileUrls = users.map( user => {
			return { url: `/${user.username}`, changefreq: "weekly", priority: 0.7 };
		});
		clubs = await Club.find().select( "name" ).exec();
		clubUrls = clubs.map( club => {
			return { url: `/c/${club.name}`, changefreq: "daily", priority: 0.8 };
		});
		sitemap = sm.createSitemap({
			hostname: "https://wanamic.com",
			cacheTime: 600000,
			urls: [
				{ url: "/", changefreq: "daily", priority: 1 },
				{ url: "/signup", changefreq: "weekly", priority: 0.6 },
				{ url: "/login", changefreq: "monthly", priority: 0.5 },
				{ url: "/settings", changefreq: "weekly", priority: 0.5 },
				{ url: "/explore", changefreq: "weekly", priority: 0.6 },
				...profileUrls,
				...clubUrls
			]
		});
		sitemap.toXML( function( err, xml ) {
			if ( err ) {
				return res.status( 500 ).end();
			}
			res.header( "Content-Type", "application/xml" );
			res.send( xml );
		});
	} catch ( err ) {
		return next( err );
	}
});


module.exports = Router;
