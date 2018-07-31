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

	if ( !req.body.token || !req.body.friendId || !req.body.content ) {
		return next( errors.blankData());
	}

	const { token, friendId, content } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId )
			.select( "fullname username profileImage openConversations" )
			.exec();
		friend = await User.findById( friendId ).exec();

		if ( !user || !friend ) {
			return next( errors.userDoesntExist());
		}
		newMessage = await new Message({
			author: user._id,
			receiver: friend._id,
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
					path: "author target",
					select: "fullname username profileImage",
					options: { sort: { createdAt: -1 } }
				})
				.populate({
					path: "messages",
					select: "author receiver content",
					populate: {
						path: "author receiver",
						select: "fullname username profileImage"
					}
				}).execPopulate();
			user.openConversations.push( userConversation._id );
		}

		if ( friendConversation ) {
			friendConversation.messages.push( newMessage );
			friendConversation.newMessagesCount += 1;
			friendConversation.save();
		} else {
			friendConversation = await new Conversation({
				author: friend._id,
				target: user._id,
				messages: [ newMessage._id ],
				newMessagesCount: 1
			}).save();
			friendConversation = await friendConversation
				.populate({
					path: "author target messages",
					select: "fullname username profileImage author receiver content",
					options: { sort: { createdAt: -1 } }
				}).execPopulate();
			friend.openConversations.push( friendConversation._id );
		}

		Promise.all([ user.save(), friend.save() ]);
	} catch ( err ) {
		return next( err );
	}
	newMessage.author = user;

	res.status( 201 );
	res.send({
		newMessage: newMessage,
		newConversation: userConversation
	});
});

Router.post( "/clearNotifications", async( req, res, next ) => {
	var
		userId,
		user,
		conversation;

	if ( !req.body.token || !req.body.targetUsername ) {
		return next( errors.blankData());
	}

	const { token, targetUsername } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId ).exec();
		target = await User.findOne({ username: targetUsername }).exec();
		if ( !user || !target ) {
			return next( errors.userDoesntExist());
		}
		conversation = await Conversation.findOne({
			$and: [ { author: user._id }, { target: target._id } ]
		}).exec();
		conversation.newMessagesCount = 0;
		Promise.all([ user.save(), conversation.save() ]);
	} catch ( err ) {
		return next( err );
	}

	res.sendStatus( 200 );
});


Router.delete( "/delete", async( req, res, next ) => {
	var
		userId,
		user,
		target,
		conversationToRemove,
		partnerConversation,
		messages;

	if ( !req.body.token || !req.body.targetId ) {
		return next( errors.blankData());
	}

	const { token, targetId } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId ).exec();
		target = await User.findById( targetId ).exec();
		if ( !user || !target ) {
			return next( errors.userDoesntExist());
		}
		conversationToRemove = await Conversation.findOne({
			$and: [ { author: user._id }, { target: target._id } ]
		}).exec();
		partnerConversation = await Conversation.findOne({
			$and: [ { author: target._id }, { target: user._id } ]
		}).exec();
		if ( !conversationToRemove ) {
			return next( errors.conversationDoesntExist());
		}
		user.openConversations = user.openConversations.filter( converId =>
			!converId.equals( conversationToRemove._id )
		);
		user.save();

		if ( !partnerConversation ) {
			messages = await Message.find({
				$or: [
					{ $and: [ { author: user._id }, { receiver: target._id } ] },
					{ $and: [ { author: target._id }, { receiver: user._id } ] }
				]
			}).remove();
		}
		conversationToRemove.remove();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});

module.exports = Router;
