const
	fs = require( "fs" ),
	mongoose = require( "mongoose" ),
	Post = require( "../models/Post" ),
	Comment = require( "../models/Comment" ),
	Conversation = require( "../models/Conversation" ),
	Notification = require( "../models/Notification" ),
	Message = require( "../models/Message" );

removeUserData = async user => {
	return new Promise( async function( resolve, reject ) {
		if ( !user ) {
			reject( "Undefined user" );
		}
		try {
			// remove user posts from network newsfeed
			await mongoose.model( "User" ).update(
				{ _id: { $in: [ ...user.friends, ...user.followers ] } },
				{ $pull: { "newsfeed": { $in: user.posts } } },
				{ multi: true }
			);
			// remove user from friends/followers/following network
			await mongoose.model( "User" ).update(
				{ _id: { $in: [ ...user.friends, ...user.followers, ...user.following ] } },
				{ $pull: {
					"friends": user._id,
					"followers": user._id,
					"following": user._id
				} },
				{ multi: true }
			);
			await Notification.remove({
				$or: [ { _id: { $in: user.notifications } }, { author: user._id } ]
			});
			await Conversation.remove({
				$or: [ { author: user._id }, { target: user._id } ]
			});
			await Message.remove({
				$or: [ { author: user._id }, { receiver: user._id } ]
			});

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
				const imagePath = "../wanamic-frontend/src/images/" + user.profileImage;
				fs.unlink( imagePath, err => {
					if ( err ) {
						reject( err );
					}
				});
			}
			if ( user.headerImage ) {
				const imagePath = "../wanamic-frontend/src/images/" + user.headerImage;
				fs.unlink( imagePath, err => {
					if ( err ) {
						reject( err );
					}
				});
			}
			resolve();
		} catch ( err ) {
			return reject( err );
		}
	});
};

module.exports = removeUserData;
