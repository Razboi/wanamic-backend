const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	Post = require( "../models/Post" ),
	Ticket = require( "../models/Ticket" ),
	Club = require( "../models/Club" ),
	LinkPreview = require( "react-native-link-preview" ),
	extractHostname = require( "../utils/extractHostname" ),
	aws = require( "aws-sdk" ),
	multer = require( "multer" ),
	multerS3 = require( "multer-s3" ),
	Notification = require( "../models/Notification" ),
	notifyMentions = require( "../utils/notifyMentions" ),
	errors = require( "../utils/errors" ),
	removePost = require( "../utils/removePost" ),
	path = require( "path" );

let
	s3 = new aws.S3({
		accessKeyId: process.env.ACCESS_KEY_ID,
		secretAccessKey: process.env.SECRET_ACCESS_KEY,
		Bucket: "wanamic.com"
	}),
	upload = process.env.NODE_ENV === "dev" ?
		multer({
			dest: "../wanamic-frontend/src/images",
			fileFilter: function( req, file, callback ) {
				var ext = path.extname( file.originalname );
				if (( file.mimetype !== "image/jpeg" && file.mimetype !== "image/png"
					&& file.mimetype !== "image/jpg" && file.mimetype !== "image/gif" )) {
					return callback( new Error(
						"Only .png .jpg .gif .jpeg images are allowed" ));
				}
				callback( null, true );
			},
			limits: {
				fileSize: 1010000
			}
		})
		:
		multer({
			storage: multerS3({
				s3: s3,
				bucket: "wanamic.com",
				metadata: function( req, file, cb ) {
					cb( null, { fieldName: file.fieldname });
				},
				key: function( req, file, cb ) {
					cb( null, Date.now().toString());
				}
			}),
			fileFilter: function( req, file, callback ) {
				var ext = path.extname( file.originalname );
				if (( file.mimetype !== "image/jpeg" && file.mimetype !== "image/png"
					&& file.mimetype !== "image/jpg" && file.mimetype !== "image/gif" )) {
					return callback( new Error(
						"Only .png .jpg .gif .jpeg images are allowed" ));
				}
				callback( null, true );
			},
			limits: {
				fileSize: 1010000
			}
		}),
	filenameProp = process.env.NODE_ENV === "dev" ?
		"filename" : "key";


Router.get( "/global/:skip/:limit", async( req, res, next ) => {
	let posts;

	if ( !req.params.skip || !req.params.limit ) {
		return next( errors.blankData());
	}
	try {
		posts = await Post.find()
			.where( "sharedPost" ).equals( undefined )
			.where( "feed" ).ne( "home" )
			.limit( parseInt( req.params.limit ))
			.skip( req.params.skip * req.params.limit )
			.sort( "-createdAt" )
			.populate({
				path: "author",
				select: "username fullname profileImage"
			})
			.populate({
				path: "club"
			})
			.exec();
	} catch ( err ) {
		return next( err );
	}
	res.send( posts );
});


Router.get( "/clubFeed/:club/:skip", async( req, res, next ) => {
	let club;

	if ( !req.params.skip || !req.params.club ) {
		return next( errors.blankData());
	}
	try {
		club = await Club.findOne({ name: req.params.club })
			.populate({
				path: "feed",
				options: {
					skip: parseInt( req.params.skip ),
					sort: "-createdAt"
				},
				populate: {
					path: "author",
					select: "username fullname profileImage"
				}
			})
			.exec();
	} catch ( err ) {
		return next( err );
	}
	res.send( club.feed );
});


Router.post( "/search/:skip", async( req, res, next ) => {
	var posts;

	if ( !req.params.skip || !req.body.search ) {
		return next( errors.blankData());
	}
	try {
		const searchRegex = new RegExp( req.body.search );
		posts = await Post.find({
			"content": { $regex: searchRegex, $options: "i" } })
			.where( "media" ).equals( true )
			.where( "sharedPost" ).equals( undefined )
			.where( "alerts.nsfw" ).equals( false )
			.where( "alerts.spoiler" ).equals( false )
			.where( "privacyRange" ).equals( "3" )
			.limit( 10 )
			.skip( req.params.skip * 10 )
			.sort( "-createdAt" )
			.populate({
				path: "author",
				select: "username fullname profileImage"
			})
			.exec();
	} catch ( err ) {
		return next( err );
	}
	res.send( posts );
});


Router.post( "/getPost", async( req, res, next ) => {
	let post;

	if ( !req.body.postId ) {
		return next( errors.blankData());
	}
	try {
		post = await Post.findById( req.body.postId )
			.populate({
				path: "author",
				select: "fullname username profileImage"
			})
			.populate({
				path: "sharedPost",
				populate: {
					path: "author",
					select: "fullname username profileImage"
				}
			})
			.exec();
	} catch ( err ) {
		return next( err );
	}
	res.send( post );
});


Router.post( "/create", async( req, res, next ) => {
	var
		userId,
		user,
		newPost,
		mentionsNotifications;

	if ( !req.body.token || !req.body.userInput ) {
		return next( errors.blankData());
	}
	const {
		token, userInput, alerts, hashtags, feed, selectedClub, mentions
	} = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		club = await Club.findOne({ name: selectedClub }).exec();
		newPost = await new Post({
			author: user._id,
			content: userInput,
			alerts: alerts,
			hashtags: hashtags,
			feed: feed,
			club: club && club._id
		}).save();
		newPost = await newPost.populate({
			path: "author",
			select: "fullname username profileImage"
		}).execPopulate();

		await User.update(
			{ _id: { $in: user.friends } },
			{ $push: { "newsfeed": newPost._id } },
			{ multi: true }
		).exec();

		if ( feed === "club" ) {
			club.feed.push( newPost._id );
			await club.save();
			await User.update(
				{ _id: { $in: club.members, $ne: user._id } },
				{ $push: { "newsfeed": newPost._id } },
				{ multi: true }
			).exec();
		}
		user.posts.push( newPost._id );
		user.newsfeed.push( newPost._id );

		mentionsNotifications = notifyMentions(
			mentions, "post", newPost, user );
		[ mentionsNotifications ] =
			await Promise.all([ mentionsNotifications, user.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.status( 201 );
	res.send({
		newPost: newPost,
		mentionsNotifications: mentionsNotifications
	});
});


Router.post( "/like", async( req, res, next ) => {
	var
		mediaImg,
		post,
		user,
		newNotification,
		userId;

	if ( !req.body.token || !req.body.postId ) {
		return next( errors.blankData());
	}
	const { token, postId } = req.body;

	try {
		userId = tokenVerifier( token );
		post = Post.findById( postId ).exec();
		user = User.findById( userId )
			.select( "username fullname profileImage" )
			.exec();
		[ post, user ] = await Promise.all([ post, user ]);
		if ( !post ) {
			return next( errors.postDoesntExist());
		}
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( post.link ) {
			mediaImg = post.linkContent.image;
		} else {
			mediaImg = post.mediaContent.image;
		}
		if ( !post.likedBy.includes( user.username )) {
			post.likedBy.push( user.username );
			await post.save();
		}
		postAuthor = await User.findById( post.author ).exec();
		postAuthor.totalLikes += 1;

		const alreadyNotificated = await Notification.findOne({
			author: user._id,
			receiver: postAuthor._id,
			content: "liked your post",
			object: post._id
		}).exec();

		if ( postAuthor.username !== user.username && !alreadyNotificated ) {
			newNotification = await new Notification({
				author: user._id,
				receiver: postAuthor._id,
				content: "liked your post",
				mediaImg: mediaImg,
				externalImg: !post.picture,
				object: post._id
			}).save();
			postAuthor.notifications.push( newNotification );
			postAuthor.newNotifications++;
			newNotification.author = user;
		}
		await postAuthor.save();
	} catch ( err ) {
		return next( err );
	}
	res.status( 201 );
	res.send( newNotification );
});


Router.patch( "/dislike", async( req, res, next ) => {
	var
		data,
		userId,
		post,
		postAuthor;

	if ( !req.body.token || !req.body.postId ) {
		return next( errors.blankData());
	}
	const { postId, token } = req.body;

	try {
		userId = tokenVerifier( token );
		post = Post.findById( postId ).exec();
		user = User.findById( userId ).exec();
		postAuthor = post.then( post => User.findById( post.author ).exec());
		[ post, user, postAuthor ] =
			await Promise.all([ post, user, postAuthor ]);
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !post ) {
			return next( errors.postDoesntExist());
		}
		if ( postAuthor && postAuthor.totalLikes > 0 ) {
			postAuthor.totalLikes -= 1;
			await postAuthor.save();
		}
		if ( post.likedBy.includes( user.username )) {
			const index = post.likedBy.indexOf( user.username );
			post.likedBy.splice( index, 1 );
		}
		await post.save();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


Router.post( "/media", async( req, res, next ) => {
	var
		userId,
		user,
		newPost,
		mentionsNotifications,
		club;

	if ( !req.body.token || !req.body.data || !req.body.data.feed ||
			!req.body.data.alerts || !req.body.data.selectedClub ) {
		return next( errors.blankData());
	}
	const { data, token } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		club = Club.findOne({ name: data.selectedClub }).exec();
		newPost = await new Post({
			author: user._id,
			media: true,
			link: !!data.link,
			content: data.content,
			alerts: data.alerts,
			hashtags: data.hashtags,
			feed: data.feed,
			club: club && club._id,
			mediaContent: {
				title: data.title,
				artist: data.artist,
				image: data.image,
				url: data.url
			}
		}).save();
		newPost = await newPost.populate({
			path: "author",
			select: "fullname username profileImage"
		}).execPopulate();
		await User.update(
			{ _id: { $in: user.friends } },
			{ $push: { "newsfeed": newPost._id } },
			{ multi: true }
		).exec();

		if ( feed === "club" ) {
			club.feed.push( newPost._id );
			await club.save();
			await User.update(
				{ _id: { $in: club.members, $ne: user._id } },
				{ $push: { "newsfeed": newPost._id } },
				{ multi: true }
			).exec();
		}
		user.posts.push( newPost._id );
		user.newsfeed.push( newPost._id );
		mentionsNotifications = notifyMentions(
			data.mentions, "post", newPost, user );
		[ mentionsNotifications ] =
			await Promise.all([ mentionsNotifications, user.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.status( 201 );
	res.send({
		newPost: newPost,
		mentionsNotifications: mentionsNotifications
	});
});


Router.post( "/mediaLink", async( req, res, next ) => {
	var
		userId,
		user,
		newPost,
		previewData,
		hostname,
		embeddedUrl,
		mentionsNotifications,
		club;

	if ( !req.body.token || !req.body.link ) {
		return next( errors.blankData());
	}

	const {
		token, link, mentions, description, alerts, hashtags, feed, selectedClub, type
	} = req.body;

	try {
		userId = tokenVerifier( token );
		previewData = LinkPreview.getPreview( link );
		user = User.findById( userId ).exec();
		[ previewData, user ] = await Promise.all([ previewData, user ]);
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( previewData.images ) {
			hostname = extractHostname( previewData.url );
			if ( hostname === "www.youtube.com" ) {
				[ embeddedUrl ] = previewData.url.replace( "watch?v=", "embed/" ).split( "&" );
			} else if ( hostname === "coub.com" ) {
				[ embeddedUrl ] = previewData.url.replace( "view", "embed" ).split( "&" );
			}
		}
		club = await Club.findOne({ name: selectedClub }).exec();
		newPost = await new Post({
			author: user._id,
			media: true,
			link: true,
			content: description,
			alerts: alerts,
			hashtags: hashtags,
			feed: feed,
			club: club && club._id,
			linkContent: {
				url: previewData.url,
				embeddedUrl: embeddedUrl,
				hostname: hostname,
				title: previewData.title,
				description: previewData.description,
				image: previewData.images && previewData.images[ 0 ],
				type: previewData.images ? "webpage" : "image"
			}
		}).save();
		newPost = await newPost.populate({
			path: "author",
			select: "fullname username profileImage"
		}).execPopulate();

		await User.update(
			{ _id: { $in: user.friends } },
			{ $push: { "newsfeed": newPost._id } },
			{ multi: true }
		).exec();

		if ( feed === "club" ) {
			club.feed.push( newPost._id );
			await club.save();
			await User.update(
				{ _id: { $in: club.members, $ne: user._id } },
				{ $push: { "newsfeed": newPost._id } },
				{ multi: true }
			).exec();
		}
		user.posts.push( newPost._id );
		user.newsfeed.push( newPost._id );
		mentionsNotifications = notifyMentions(
			mentions, "post", newPost, user );
		[ mentionsNotifications ] =
			await Promise.all([ mentionsNotifications, user.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.status( 201 );
	res.send({
		newPost: newPost,
		mentionsNotifications: mentionsNotifications
	});
});


Router.post( "/mediaPicture", upload.single( "picture" ), async( req, res, next ) => {
	var
		newPost,
		mentionsNotifications,
		user,
		userId,
		club;

	if ( !req.body.token || !req.body || !req.file ) {
		return next( errors.blankData());
	}
	const {
		token, mentions, hashtags, content, nsfw, spoiler,
		spoilerDescription, feed, selectedClub
	} = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		club = await Club.findOne({ name: selectedClub }).exec();
		newPost = await new Post({
			author: user._id,
			media: true,
			picture: true,
			content: content,
			feed: feed,
			club: club && club._id,
			alerts: {
				nsfw: nsfw,
				spoiler: spoiler,
				spoilerDescription: spoilerDescription
			},
			hashtags: hashtags,
			mediaContent: {
				image: req.file[ filenameProp ],
			}
		}).save();
		newPost = await newPost.populate({
			path: "author",
			select: "fullname username profileImage"
		}).execPopulate();

		await User.update(
			{ _id: { $in: user.friends } },
			{ $push: { "newsfeed": newPost._id } },
			{ multi: true }
		).exec();

		if ( feed === "club" ) {
			club.feed.push( newPost._id );
			await club.save();
			await User.update(
				{ _id: { $in: club.members, $ne: user._id } },
				{ $push: { "newsfeed": newPost._id } },
				{ multi: true }
			).exec();
		}
		user.posts.push( newPost._id );
		user.newsfeed.push( newPost._id );
		mentionsNotifications = notifyMentions(
			mentions, "post", newPost, user	);
		[ mentionsNotifications ] =
			await Promise.all([ mentionsNotifications, user.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.status( 201 );
	res.send({
		newPost: newPost,
		mentionsNotifications: mentionsNotifications
	});
});


Router.post( "/home/:skip", async( req, res, next ) => {
	var
		userId,
		user;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}
	try {
		userId = tokenVerifier( req.body.token );
		user = await User.findById( userId )
			.populate({
				path: "newsfeed",
				options: {
					limit: 10,
					skip: req.params.skip * 10,
					sort: { createdAt: -1 }
				},
				populate: [
					{
						path: "author",
						select: "fullname username profileImage"
					},
					{
						path: "sharedPost",
						populate: {
							path: "author",
							select: "fullname username profileImage",
						},
					},
					{
						path: "club"
					}
				]
			})
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
	} catch ( err ) {
		return next( err );
	}
	res.send( user.newsfeed );
});


Router.post( "/timeline/:skip", async( req, res, next ) => {
	var
		user;

	if ( !req.body.token || !req.body.username || !req.params.skip ) {
		return next( errors.blankData());
	}
	const { username, token } = req.body;
	try {
		// token will be useful when adding user blocking
		user = await User.findOne({ username: username })
			.populate({
				path: "posts",
				options: {
					limit: 10,
					skip: req.params.skip * 10,
					sort: { createdAt: -1 }
				},
				populate: [
					{
						path: "author",
						select: "fullname username profileImage"
					},
					{
						path: "sharedPost",
						populate: {
							path: "author",
							select: "fullname username profileImage",
						},
					},
					{
						path: "club"
					}
				]
			})
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
	} catch ( err ) {
		return next( err );
	}
	res.send( user.posts );
});


Router.delete( "/delete", async( req, res, next ) => {
	var userId;

	if ( !req.body.postId || !req.body.token ) {
		return next( errors.blankData());
	}
	const { postId, token } = req.body;

	try {
		userId = tokenVerifier( token );
		user = User.findById( userId ).exec();
		post = Post.findById( postId ).populate( "club" ).exec();
		[ user, post ] = await Promise.all([ user, post ]);
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !post ) {
			return next( errors.postDoesntExist());
		}
		const clubPresident = post.club && post.club.president;
		if ( !user._id.equals( post.author._id ) && !user._id.equals( clubPresident )) {
			return next( errors.unauthorized());
		}
		await removePost( user, post );
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 200 );
});


Router.patch( "/update", async( req, res, next ) => {
	var
		userId,
		user,
		post;

	if ( !req.body.token || !req.body.postId ||
		req.body.newContent === undefined ) {
		return next( errors.blankData());
	}
	const { token, postId, newContent, mentions, hashtags } = req.body;

	try {
		userId = tokenVerifier( token );
		user = User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		post = Post.findById( postId )
			.populate({
				path: "sharedPost",
				populate: {
					path: "author",
					select: "username fullname profileImage"
				}
			})
			.populate({
				path: "author", select: "username fullname profileImage"
			})
			.exec();
		[ user, post ] = await Promise.all([ user, post ]);
		if ( !user._id.equals( post.author._id )) {
			return next( errors.unauthorized());
		}
		post.content = newContent;
		post.hashtags = hashtags;
		mentionsNotifications = notifyMentions(
			mentions, "post", post, user );
		[ mentionsNotifications ] =
			await Promise.all([ mentionsNotifications, post.save() ]);
	} catch ( err ) {
		return next( err );
	}
	res.send({
		updatedPost: post,
		mentionsNotifications: mentionsNotifications
	});
});


Router.post( "/share", async( req, res, next ) => {
	var
		userId,
		user,
		postToShare,
		originalPost,
		newPost,
		mentionsNotifications;

	if ( !req.body.postId || !req.body.token ) {
		return next( errors.blankData());
	}
	const { postId, token, description, mentions, hashtags } = req.body;

	try {
		userId = tokenVerifier( token );
		user = User.findById( userId ).exec();
		postToShare = Post.findById( postId )
			.populate({
				path: "sharedPost",
				populate: {
					path: "author",
					select: "fullname username profileImage",
				}
			})
			.populate({
				path: "author",
				select: "username fullname profileImage"
			})
			.exec();
		[ user, postToShare ] = await Promise.all([ user, postToShare ]);
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !postToShare ) {
			return next( errors.postDoesntExist());
		}
		if ( postToShare.sharedPost ) {
			originalPost = postToShare.sharedPost;
		} else {
			originalPost = postToShare;
		}
		newPost = await new Post({
			author: user._id,
			content: description,
			sharedPost: originalPost._id,
			hashtags: hashtags,
			alerts: originalPost.alerts,
			feed: "home"
		}).save();

		await User.update(
			{ _id: { $in: user.friends } },
			{ $push: { "newsfeed": newPost._id } },
			{ multi: true }
		).exec();
		user.posts.push( newPost._id );
		user.newsfeed.push( newPost._id );

		mentionsNotifications = notifyMentions(
			mentions, "post", newPost, user );
		[ mentionsNotifications ] =
			await Promise.all([ mentionsNotifications, user.save() ]);

		if ( !postToShare.sharedBy.includes( String( user._id ))) {
			postToShare.sharedBy.push( user._id );
			await postToShare.save();
		}
		newPost = await newPost.populate({
			path: "author",
			select: "fullname username profileImage"
		}).execPopulate();
		newPost.sharedPost = originalPost;
	} catch ( err ) {
		return next( err );
	}
	res.status( 201 );
	res.send({
		newPost: newPost,
		postToShare: postToShare,
		mentionsNotifications: mentionsNotifications
	});
});


Router.post( "/report", async( req, res, next ) => {
	var
		userId,
		user,
		post;

	if ( !req.body.postId || !req.body.token || !req.body.content ) {
		return next( errors.blankData());
	}
	const { postId, content, token } = req.body;

	try {
		userId = tokenVerifier( token );
		user = await User.findById( userId ).exec();
		post = await Post.findById( postId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		await new Ticket({
			author: user._id,
			target: post.author,
			object: post._id,
			content: content,
			report: true,
			type: "post"
		}).save();
	} catch ( err ) {
		return next( err );
	}
	res.sendStatus( 201 );
});


module.exports = Router;
