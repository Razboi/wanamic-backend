const
	User = require( "../models/User" ),
	Notification = require( "../models/Notification" );

notifyMentions = ( mentions, type, object, user ) => {
	var
		notifications = [],
		mediaImg,
		i;

	return new Promise( async function( resolve, reject ) {
		if ( !mentions || !mentions.length > 0 ) {
			resolve( undefined );
		}
		if ( object.link ) {
			mediaImg = object.linkContent.image;
		} else {
			mediaImg = object.mediaContent.image;
		}

		const mentionsLength = mentions.length;

		for ( i = 0; i < mentionsLength; i++ ) {
			await User.findOne({ username: mentions[ i ] })
				.exec()
				.then( targetUser => {
					if ( targetUser && targetUser.username !== user.username ) {
						new Notification({
							author: user._id,
							receiver: targetUser._id,
							content: "mentioned you in a " + type,
							mediaImg: mediaImg,
							externalImg: !object.picture,
							object: object._id,
							comment: type === "comment"
						}).save()
							.then( notification => {
								notifications.push( notification );
								targetUser.notifications.push( notification );
								targetUser.newNotifications++;
								targetUser.save();

								if ( i === mentionsLength ) {
									resolve( notifications );
								}
							}).catch( err => console.log( err ));
					}
				}).catch( err => console.log( err ));
		}
	});
};

module.exports = notifyMentions;
