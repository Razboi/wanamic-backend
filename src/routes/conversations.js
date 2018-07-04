const
	Router = require( "express" ).Router(),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../utils/tokenGenerator" ),
	User = require( "../models/User" ),
	Message = require( "../models/Message" ),
	Conversation = require( "../models/Conversation" ),
	errors = require( "../utils/errors" );


Router.post( "/retrieve", async( req, res, next ) => {
	var
		userId,
		user,
		friend,
		conversation;

	if ( !req.body.token || !req.body.friendUsername ) {
		return next( errors.blankData());
	}

	const { token, friendUsername } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId ).exec();
		friend = await User.findOne({ username: friendUsername }).exec();
		if ( !user || !friend ) {
			return next( errors.userDoesntExist());
		}
		conversation = await Conversation.findOne({
			$and: [ { author: user._id }, { target: friend._id } ]
		})
			.populate({
				path: "author target messages",
				select: "fullname username profileImage author receiver content",
				options: {
					sort: { createdAt: -1 }
				}
			})
			.exec();
	} catch ( err ) {
		return next( err );
	}
	res.send( conversation );
});


Router.post( "/add", async( req, res, next ) => {
	var
		userId,
		user,
		friend,
		newMessage,
		userConversation,
		friendConversation;

	if ( !req.body.token || !req.body.friendUsername || !req.body.content ) {
		return next( errors.blankData());
	}

	const { token, friendUsername, content } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId ).exec(),
		friend = await User.findOne({ username: friendUsername }).exec();

		if ( !user || !friend ) {
			return next( errors.userDoesntExist());
		}
		newMessage = await new Message({
			author: user.username,
			receiver: friend.username,
			content: content
		}).save(),
		userConversation = await Conversation.findOne({
			$and: [ { author: user._id }, { target: friend._id } ]
		}).exec();
		friendConversation = await Conversation.findOne({
			$and: [ { author: friend._id }, { target: user._id } ]
		}).exec();

		if ( userConversation ) {
			userConversation.messages.push( newMessage );
			userConversation.save();
		} else {
			userConversation = await new Conversation({
				author: user._id,
				target: friend._id,
				messages: [ newMessage._id ]
			}).save();
			userConversation = await userConversation
				.populate({
					path: "author target messages",
					select: "fullname username profileImage author receiver content",
					options: { sort: { createdAt: -1 } }
				}).execPopulate();
			user.openConversations.push( userConversation._id );
		}

		if ( friendConversation ) {
			friendConversation.messages.push( newMessage );
			friendConversation.save();
		} else {
			friendConversation = await new Conversation({
				author: friend._id,
				target: user._id,
				messages: [ newMessage._id ]
			}).save();
			friendConversation = await friendConversation
				.populate({
					path: "author target messages",
					select: "fullname username profileImage author receiver content",
					options: { sort: { createdAt: -1 } }
				}).execPopulate();
			friend.openConversations.push( friendConversation._id );
		}

		if ( !friend.chatNotifications.includes( user.username )) {
			friend.chatNotifications.push( user.username );
		}

		Promise.all([ user.save(), friend.save() ]);
	} catch ( err ) {
		return next( err );
	}

	res.status( 201 );
	res.send({
		newMessage: newMessage,
		newConversation: userConversation
	});
});

module.exports = Router;
