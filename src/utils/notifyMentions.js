const
	User = require( "../models/User" ),
	Notification = require( "../models/Notification" );

notifyMentions = ( mentions, type, object, user ) => {
	var i;

	if ( !mentions || !mentions.length > 0 ) {
		return;
	}

	for ( i = 0; i < mentions.length; i++ ) {
		new Notification({
			author: user.username,
			receiver: mentions[ i ],
			content: "mentioned you in a " + type,
			object: object._id,
			comment: type === "comment"
		}).save()
			.then( notification => {
				User.findOne({ username: notification.receiver })
					.exec()
					.then( targetUser => {
						targetUser.notifications.push( notification );
						targetUser.save();
					})
					.catch( err => console.log( err ));
			}).catch( err => console.log( err ));
	}
};

module.exports = notifyMentions;
