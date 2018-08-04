const
	User = require( "../models/User" ),
	Notification = require( "../models/Notification" );

notifyMentions = ( mentions, type, object, user ) => {
	var
		notifications = [],
		mediaImg,
		i;

	return new Promise( async function( resolve, reject ) {
		if ( !mentions || mentions.length === 0 ) {
			resolve( undefined );
		}
		try {
			if ( object.media ) {
				object.link ?
					mediaImg = object.linkContent.image
					:
					mediaImg = object.mediaContent.image;
			}

			const mentionsLength = mentions.length;

			for ( i = 0; i < mentionsLength; i++ ) {
				const
					targetUser = await User.findOne({
						username: mentions[ i ] }).exec(),
					alreadyNotificated = await Notification.findOne({
						author: user._id,
						receiver: targetUser._id,
						object: object._id,
						content: "mentioned you in a " + type,
						comment: false
					}).exec();

				if ( !targetUser ) {
					reject( "Target user doesn't exist" );
				}

				if ( !alreadyNotificated && targetUser.username !== user.username ) {
					const notification = await new Notification({
						author: user._id,
						receiver: targetUser._id,
						content: "mentioned you in a " + type,
						mediaImg: mediaImg,
						externalImg: !object.picture,
						object: object._id,
						comment: type === "comment"
					}).save();
					notifications.push( notification );
					targetUser.notifications.push( notification );
					targetUser.newNotifications++;
					targetUser.save();
				}
				if ( i === mentionsLength - 1 ) {
					resolve( notifications );
				}
			}
		} catch ( err ) {
			reject( err );
		}
	});
};

module.exports = notifyMentions;
