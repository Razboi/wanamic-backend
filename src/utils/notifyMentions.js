const
	User = require( "../models/User" ),
	Notification = require( "../models/Notification" );

notifyMentions = ( mentions, type, object, user ) => {
	var
		notifications = [],
		i;

	return new Promise( async function( resolve, reject ) {
		if ( !mentions || !mentions.length > 0 ) {
			resolve( undefined );
		}

		const mentionsLength = mentions.length;

		for ( i = 0; i < mentionsLength; i++ ) {
			await new Notification({
				author: user.username,
				receiver: mentions[ i ],
				content: "mentioned you in a " + type,
				object: object._id,
				comment: type === "comment"
			}).save()
				.then( notification => {
					notifications.push( notification );
					User.findOne({ username: notification.receiver })
						.exec()
						.then( targetUser => {
							targetUser.notifications.push( notification );
							targetUser.save();
						})
						.catch( err => console.log( err ));
				}).catch( err => console.log( err ));
		}
		resolve( notifications );
	});
};

module.exports = notifyMentions;
