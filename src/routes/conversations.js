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
			$and: [
				{ $or: [ { author: user._id }, { author: friend._id } ] },
				{ $or: [ { target: user._id }, { target: friend._id } ] }
			]
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
	conversation = conversation.toObject();
	if ( conversation.target._id.equals( user._id )) {
		conversation.target = conversation.author;
	}
	delete conversation.author;
	res.send( conversation );
});


Router.post( "/add", async( req, res, next ) => {
	var
		userId,
		user,
		friend,
		newMessage,
		oldConversation,
		newConversation;

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
		oldConversation = await Conversation.findOne({
			$and: [
				{ $or: [ { author: user._id }, { author: friend._id } ] },
				{ $or: [ { target: user._id }, { target: friend._id } ] }
			]
		}).exec();
	} catch ( err ) {
		return next( err );
	}

	if ( oldConversation ) {
		oldConversation.messages.push( newMessage );
		oldConversation.save();
	} else {
		try {
			newConversation = await new Conversation({
				author: user._id,
				target: friend._id,
				messages: [ newMessage._id ]
			}).save();

			newConversation = await newConversation
				.populate({
					path: "author target messages",
					select: "fullname username profileImage author receiver content",
					options: { sort: { createdAt: -1 } }
				}).execPopulate();
		} catch ( err ) {
			return next( err );
		}
		user.openConversations.push( newConversation._id );
		friend.openConversations.push( newConversation._id );
		Promise.all([ user.save(), friend.save() ]);
	}

	res.status( 201 );
	res.send({
		newMessage: newMessage,
		newConversation: newConversation
	});
});

module.exports = Router;
