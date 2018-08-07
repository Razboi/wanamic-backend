const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	Message = require( "../models/Message" ),
	Conversation = require( "../models/Conversation" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
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
		userId = tokenVerifier( token );
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
		userId = tokenVerifier( token );
		user = User.findById( userId )
			.select( "fullname username profileImage openConversations" )
			.exec();
		friend = User.findById( friendId ).exec();
		[ user, friend ] = await Promise.all([ user, friend ]);
		if ( !user || !friend ) {
			return next( errors.userDoesntExist());
		}
		newMessage = new Message({
			author: user._id,
			receiver: friend._id,
			content: content
		}).save(),
		userConversation = Conversation.findOne({
			$and: [ { author: user._id }, { target: friend._id } ]
		}).exec();
		friendConversation = Conversation.findOne({
			$and: [ { author: friend._id }, { target: user._id } ]
		}).exec();
		[ newMessage, userConversation, friendConversation ] =
		await Promise.all([ newMessage, userConversation,
			friendConversation ]);

		if ( userConversation ) {
			userConversation.messages.push( newMessage );
			await userConversation.save();
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
			await friendConversation.save();
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
		newMessage.author = user;
	} catch ( err ) {
		return next( err );
	}
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
		target,
		conversation;

	if ( !req.body.token || !req.body.targetUsername ) {
		return next( errors.blankData());
	}
	const { token, targetUsername } = req.body;

	try {
		userId = tokenVerifier( token );
		target = await User.findOne({ username: targetUsername }).exec();
		if ( !target ) {
			return next( errors.userDoesntExist());
		}
		conversation = await Conversation.findOne({
			$and: [ { author: userId }, { target: target._id } ]
		}).exec();
		conversation.newMessagesCount = 0;
		Promise.all([ conversation.save() ]);
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
		userId = tokenVerifier( token );
		user = User.findById( userId ).exec();
		target = User.findById( targetId ).exec();
		[ user, target ] = await Promise.all([ user, target ]);
		if ( !user || !target ) {
			return next( errors.userDoesntExist());
		}
		conversationToRemove = Conversation.findOne({
			$and: [ { author: user._id }, { target: target._id } ]
		}).exec();
		partnerConversation = Conversation.findOne({
			$and: [ { author: target._id }, { target: user._id } ]
		}).exec();
		[ conversationToRemove, partnerConversation ] =
		await Promise.all([ conversationToRemove, partnerConversation ]);
		if ( !conversationToRemove ) {
			return next( errors.conversationDoesntExist());
		}
		user.openConversations = user.openConversations.filter( converId =>
			!converId.equals( conversationToRemove._id )
		);
		if ( !partnerConversation ) {
			messages = await Message.find({
				$or: [
					{ $and: [ { author: user._id }, { receiver: target._id } ] },
					{ $and: [ { author: target._id }, { receiver: user._id } ] }
				]
			}).remove();
		}
		Promise.all([ user.save(), conversationToRemove.remove() ]);
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});

module.exports = Router;
