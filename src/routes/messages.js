const
	Router = require( "express" ).Router(),
	bcrypt = require( "bcrypt" ),
	tokenGenerator = require( "../utils/tokenGenerator" ),
	User = require( "../models/User" ),
	Message = require( "../models/Message" ),
	errors = require( "../utils/errors" );

Router.post( "/retrieve", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || !req.body.friendUsername ) {
		return next( errors.blankData());
	}

	const data = req.body;

	try {
		userId = tokenVerifier( data.token );
	} catch ( err ) {
		return next( err );
	}

	User.findById( userId )
		.exec()
		.then( user => {
			if ( !user ) {
				return next( errors.userDoesntExist());
			}
			Message.find({
				$and: [
					{ $or: [ { author: user.username }, { author: data.friendUsername } ] },
					{ $or: [ { receiver: user.username }, { receiver: data.friendUsername } ] }
				]
			})
				.sort({ createdAt: -1 })
				.exec()
				.then( messages => res.send( messages ))
				.catch( err => next( err ));
		}).catch( err => next( err ));
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
						.then(() => {
							// if there isn't an open conversation, add one
							if ( !user.openConversations.some( id => friend._id.equals( id ))) {
								user.openConversations.push( friend._id );
							}
							if ( !friend.openConversations.some( id => user._id.equals( id ))) {
								friend.openConversations.push( user._id );
							}

							Promise.all([ user.save(), friend.save() ])
								.then(() => res.sendStatus( 201 ))
								.catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

module.exports = Router;
