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
	res.send( conversation );
});

Router.post( "/add", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || !req.body.friendUsername || !req.body.content ) {
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
			User.findOne({ username: req.body.friendUsername })
				.exec()
				.then( friend => {
					if ( !friend ) {
						return next( errors.userDoesntExist());
					}
					new Message({
						author: user.username,
						receiver: friend.username,
						content: req.body.content
					}).save()
						.then( newMessage => {
							Conversation.findOne({
								$and: [
									{ $or: [ { author: user._id }, { author: friend._id } ] },
									{ $or: [ { target: user._id }, { target: friend._id } ] }
								]
							}).exec()
								.then( oldConversation => {
									if ( oldConversation ) {
										oldConversation.messages.push( newMessage );
										oldConversation.save().catch( err => next( err ));
										if ( !user.openConversations.some( id =>
											oldConversation._id.equals( id ))) {
											user.openConversations.push( oldConversation._id );
											user.save();
										}
									} else {
										new Conversation({
											author: user._id,
											target: friend._id,
											messages: [ newMessage._id ]
										}).save()
											.then( newConversation => {
												user.openConversations.push( newConversation._id );
												friend.openConversations.push( newConversation._id );
												Promise.all([ user.save(), friend.save() ]);
											}).catch( err => next( err ));
									}
									res.sendStatus( 201 );
								}).catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

module.exports = Router;
