const
	User = require( "../models/User" ),
	nodemailer = require( "nodemailer" ),
	Email = require( "email-templates" ),
	Notification = require( "../models/Notification" );

notifyMentions = async( mentions, type, object, user ) => {
	let
		notifications = [],
		mediaImg;

	if ( !mentions || mentions.length === 0 ) {
		return [];
	}
	if ( !user || !user._id || !user.username ) {
		throw new Error( "Expected user data not found." );
	}
	if ( !object || !object._id ) {
		throw new Error( "Expected object data not found." );
	}
	if ( !type ) {
		throw new Error( "No type provided." );
	}
	try {
		if ( object.media ) {
			object.link ?
				mediaImg = object.linkContent.image
				:
				mediaImg = object.mediaContent.image;
		}

		for ( let mention of mentions ) {
			const	targetUser = await User.findOne({ username: mention }).exec();

			if ( !targetUser ) {
				throw "Target user doesn't exist";
			}
			const alreadyNotificated = await Notification.findOne({
				author: user._id,
				receiver: targetUser._id,
				object: object._id,
				content: "mentioned you in a " + type,
				comment: false
			}).exec();

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
				await targetUser.save();

				const
					email = new Email(),
					html = await email.render( "mention_notification", {
						name: targetUser.fullname.split( " " )[ 0 ],
						author: user.fullname,
						type: type
					});
				let transporter = nodemailer.createTransport({
					service: "gmail",
					auth: {
						user: process.env.EMAIL_ADDRESS,
						pass: process.env.EMAIL_PASSWORD
					}
				});
				const
					mailOptions = {
						from: `Wanamic ${process.env.EMAIL_ADDRESS}`,
						to: targetUser.email,
						subject: "New mention",
						html: html
					};
				transporter.sendMail( mailOptions )
					.catch( err => {
						throw err;
					});
			}
		}
		return notifications;
	} catch ( err ) {
		throw err;
	}
};

module.exports = notifyMentions;
