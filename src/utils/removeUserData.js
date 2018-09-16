const
	removeImage = require( "./removeImage" ),
	mongoose = require( "mongoose" ),
	Post = require( "../models/Post" ),
	Comment = require( "../models/Comment" ),
	Conversation = require( "../models/Conversation" ),
	Notification = require( "../models/Notification" ),
	Message = require( "../models/Message" );

removeUserData = async user => {
	if ( !user ) {
		throw new Error( "Undefined user" );
	}
	try {
		// remove user posts from network newsfeed
		let
			updateNewsfeed = mongoose.model( "User" ).update(
				{ _id: { $in: [ ...user.friends, ...user.followers ] } },
				{ $pull: { "newsfeed": { $in: user.posts } } },
				{ multi: true }
			),
			// remove user from friends/followers/following network
			updateNetwork = mongoose.model( "User" ).update(
				{ _id: { $in: [ ...user.friends, ...user.followers, ...user.following ] } },
				{ $pull: {
					"friends": user._id,
					"followers": user._id,
					"following": user._id
				} },
				{ multi: true }
			),
			removeNotifications = Notification.remove({
				$or: [ { _id: { $in: user.notifications } }, { author: user._id } ]
			}),
			removeConversations = Conversation.remove({
				$or: [ { author: user._id }, { target: user._id } ]
			}),
			removeMessages = Message.remove({
				$or: [ { author: user._id }, { receiver: user._id } ]
			});
		Promise.all([
			updateNewsfeed, updateNetwork, removeNotifications,
			removeConversations, removeMessages ]);

		// middleware will only fire for ModelDocument.remove
		const
			comments = await Comment.find({ author: user._id }),
			posts = await Post.find({ _id: { $in: user.posts } });
		for ( const comment of comments ) {
			await comment.remove();
		}
		for ( const post of posts ) {
			await post.remove();
		}

		if ( user.profileImage ) {
			removeImage( user.profileImage );
		}
		if ( user.headerImage ) {
			removeImage( user.headerImage );
		}
		return true;
	} catch ( err ) {
		throw err;
	}
};

module.exports = removeUserData;
