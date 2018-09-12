const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	Club = require( "../models/Club" ),
	Post = require( "../models/Post" ),
	Ticket = require( "../models/Ticket" ),
	Notification = require( "../models/Notification" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	errors = require( "../utils/errors" );

Router.post( "/requestCreation", async( req, res, next ) => {
	var
		userId,
		user;

	if ( !req.body.token || !req.body.name || !req.body.title
		|| !req.body.description ) {
		return next( errors.blankData());
	}
	const { token, name, title, description } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		const existingClub = await Club.findOne({ name: name }).exec();
		if ( existingClub ) {
			return next( errors.duplicatedClub());
		}
		const userRequests = await Ticket.find({ author: user._id }).exec();
		if ( userRequests.length >= 2 ) {
			return next( errors.exceededClubRequests());
		}
		const newClub = await new Club({
			president: user._id,
			name: name,
			title: title,
			description: description
		}).save();
		await new Ticket({
			author: user._id,
			clubName: newClub.name,
			content: `${name}: ${title}`,
			clubRequest: true
		}).save();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 201 );
});


Router.post( "/update", async( req, res, next ) => {
	var
		userId,
		user,
		club;

	if ( !req.body.token || !req.body.clubId || !req.body.title
		|| !req.body.description ) {
		return next( errors.blankData());
	}
	const { token, clubId, title, description } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		club = await Club.findById( clubId ).exec();
		if ( !user._id.equals( club.president )) {
			return next( errors.unauthorized());
		}
		club.title = title;
		club.description = description;
		await club.save();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


Router.post( "/approveCreation", async( req, res, next ) => {
	var
		userId,
		user,
		club;

	if ( !req.body.token || !req.body.clubID ) {
		return next( errors.blankData());
	}
	const { token, clubID } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !user.admin ) {
			return next( errors.unauthorized());
		}
		club = await Club.findById( clubID ).exec();
		requester = await User.findById( club.president ).exec();
		requester.clubs.push( club._id );
		club.approved = true;
		club.members.push( requester._id );
		await club.save();
		approvedNotification = await new Notification({
			author: user._id,
			content: `Your "${club.name}" club request has been approved.`,
			receiver: requester._id,
			clubRequestResponse: true,
			clubName: club.name
		}).save();
		requester.notifications.push( approvedNotification );
		requester.newNotifications++;
		await requester.save();
		const ticket = await Ticket.findOne({
			clubRequest: true, clubName: club.name
		}).exec();
		ticket.remove();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


Router.delete( "/rejectCreation", async( req, res, next ) => {
	var
		userId,
		user,
		club,
		requester;

	if ( !req.body.token || !req.body.clubID || !req.body.feedback ) {
		return next( errors.blankData());
	}
	const { token, clubID, feedback } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !user.admin ) {
			return next( errors.unauthorized());
		}
		club = await Club.findById( clubID ).exec();
		const ticket = await Ticket.findOne({
			clubRequest: true, clubName: club.name
		}).exec();
		Promise.all([ ticket.remove(), club.remove() ]);
		requester = await User.findById( club.president ).exec();
		rejectionNotification = await new Notification({
			author: user._id,
			content: `Your "${club.name}" club request has been rejected, reason: ${feedback}`,
			receiver: requester._id,
			clubRequestResponse: true
		}).save();
		requester.notifications.push( rejectionNotification );
		requester.newNotifications++;
		await requester.save();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


Router.get( "/getClub/:club", async( req, res, next ) => {
	var
		club;

	if ( !req.params.club ) {
		return next( errors.blankData());
	}
	try {
		club = await Club.findOne({ name: req.params.club })
			.populate({
				path: "feed",
				options: {
					limit: 10
				},
				populate: {
					path: "author",
					select: "fullname username profileImage"
				}
			})
			.populate({
				path: "president",
				select: "fullname username profileImage"
			})
			.exec();
		if ( !club ) {
			return next( errors.clubDoesntExist());
		}
	} catch ( err ) {
		return next( err );
	}
	res.send( club );
});


Router.post( "/joinClub", async( req, res, next ) => {
	var
		userId,
		user,
		club;

	if ( !req.body.token || !req.body.clubID ) {
		return next( errors.blankData());
	}
	const { token, clubID } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		club = await Club.findById( clubID ).exec();
		if ( club.bannedUsers.includes( user._id )) {
			return next( errors.bannedFromClub());
		}
		!club.members.includes( user._id ) && club.members.push( user._id );
		!user.clubs.includes( club._id ) && user.clubs.push( club._id );
		await Promise.all([ club.save(), user.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.status( 201 );
	res.send( club.members );
});


Router.post( "/exitClub", async( req, res, next ) => {
	var
		userId,
		user,
		club,
		updatedMembers,
		updatedClubs;

	if ( !req.body.token || !req.body.clubID ) {
		return next( errors.blankData());
	}
	const { token, clubID } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		club = await Club.findById( clubID ).exec();
		if ( user._id.equals( club.president )) {
			return next( errors.presidentCantExit());
		}
		updatedMembers = club.members.filter( member =>
			!member.equals( user._id ));
		club.members = updatedMembers;

		updatedClubs = user.clubs.filter( userClub =>
			!userClub.equals( club._id ));
		user.clubs = updatedClubs;
		await Promise.all([ club.save(), user.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.send( updatedMembers );
});


Router.post( "/addModerator", async( req, res, next ) => {
	var
		userId,
		user,
		target,
		club;

	if ( !req.body.token || !req.body.targetID || !req.body.clubID ) {
		return next( errors.blankData());
	}
	const { token, clubID, targetID } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		target = await User.findById( targetID ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		club = await Club.findById( clubID ).exec();
		if ( club.president !== user._id && !club.moderators.includes( user._id )) {
			return next( errors.unauthorized());
		}
		club.moderators.push( target._id );
		user.clubs.push( club._id );
		if ( !target.clubs.includes( club._id )) {
			target.clubs.push( club._id );
		}
		await Promise.all([ club.save(), user.save(), target.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 201 );
});


Router.post( "/banUser", async( req, res, next ) => {
	var
		userId,
		user,
		target,
		club;

	if ( !req.body.token || !req.body.targetId || !req.body.clubName ) {
		return next( errors.blankData());
	}
	const { token, targetId, clubName } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		target = await User.findById( targetId ).exec();
		if ( !user || !target ) {
			return next( errors.userDoesntExist());
		}
		club = await Club.findOne({ name: clubName }).exec();
		if ( !club.president.equals( user._id ) && !club.moderators.includes( user._id )) {
			return next( errors.unauthorized());
		}
		club.bannedUsers.push( target._id );
		target.clubs = target.clubs.filter( userClub =>
			!userClub._id.equals( club._id ));
		await Promise.all([ club.save(), target.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


Router.post( "/requestSuccessor", async( req, res, next ) => {
	var
		userId,
		user,
		successor,
		club;

	if ( !req.body.token || !req.body.username || !req.body.clubId ) {
		return next( errors.blankData());
	}
	const { token, username, clubId } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		successor = await User.findOne({ username: username }).exec();
		if ( !user || !successor ) {
			return next( errors.userDoesntExist());
		}
		club = await Club.findById( clubId ).exec();
		if ( !club.president.equals( user._id ) && !club.moderators.includes( user._id )) {
			return next( errors.unauthorized());
		}
		const alreadyNotified = await Notification.findOne({
			author: user._id,
			receiver: successor._id,
			clubSuccession: true,
			clubName: club.name
		}).exec();
		if ( alreadyNotified ) {
			return next( errors.duplicatedNotification());
		}
		const notification = await new Notification({
			author: user._id,
			receiver: successor._id,
			content: `${user.fullname} has offered you the presidency of ${club.title}.`,
			clubSuccession: true,
			clubName: club.name
		}).save();
		successor.notifications.push( notification );
		successor.newNotifications++;
		await Promise.all([ club.save(), successor.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 201 );
});


Router.post( "/acceptPresidency", async( req, res, next ) => {
	var
		userId,
		user,
		successor,
		club;

	if ( !req.body.token || !req.body.clubName ) {
		return next( errors.blankData());
	}
	const { token, clubName } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		club = await Club.findOne({ name: clubName }).exec();
		const notification = await Notification.findOne({
			author: club.president,
			receiver: user._id,
			clubSuccession: true
		}).exec();
		if ( notification ) {
			club.president = user._id;
			await notification.remove();
			!club.members.includes( user._id ) && club.members.push( user._id );
			!user.clubs.includes( club._id ) && user.clubs.push( club._id );
		}
		await Promise.all([ club.save(), user.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


Router.get( "/suggestions", async( req, res, next ) => {
	var
		clubs;

	try {
		clubs = await Club.aggregate()
			.sample( 6 )
			.match({ approved: true })
			.exec();
	} catch ( err ) {
		return next( err );
	}
	res.send( clubs );
});


Router.get( "/randomClub", async( req, res, next ) => {
	var
		club;

	try {
		[ club ] = await Club.aggregate()
			.sample( 1 )
			.match({ approved: true })
			.exec();
		club.president = await User.findById( club.president )
			.select( "username fullname" )
			.exec();
		club.feed = await Post.find({ "_id": { $in: club.feed } })
			.populate({
				path: "author",
				select: "username fullname profileImage"
			}).exec();
	} catch ( err ) {
		return next( err );
	}
	res.send( club );
});


Router.get( "/search/:name", async( req, res, next ) => {
	var
		club;

	try {
		const searchRegex = new RegExp( req.params.name );
		club = await Club.findOne({
			name: { $regex: searchRegex, $options: "i" }
		})
			.populate({
				path: "president",
				select: "username fullname profileImage"
			})
			.populate({
				path: "feed",
				options: {
					limit: 10,
					sort: "-createdAt"
				},
				populate: {
					path: "author",
					select: "username fullname profileImage"
				}
			})
			.where( "approved" ).equals( true )
			.exec();
	} catch ( err ) {
		return next( err );
	}
	res.send( club );
});


module.exports = Router;
