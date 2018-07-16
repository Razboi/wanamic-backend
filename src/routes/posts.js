const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	Post = require( "../models/Post" ),
	LinkPreview = require( "react-native-link-preview" ),
	extractHostname = require( "../utils/extractHostname" ),
	multer = require( "multer" ),
	upload = multer({ dest: "../wanamic-frontend/src/images" }),
	Notification = require( "../models/Notification" ),
	notifyMentions = require( "../utils/notifyMentions" ),
	errors = require( "../utils/errors" ),
	fs = require( "fs" );

Router.get( "/explore/:skip", async( req, res, next ) => {
	var posts;

	if ( !req.params.skip ) {
		return next( errors.blankData());
	}
	try {
		posts = await Post.find()
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

Router.post( "/getPost", ( req, res, next ) => {

	if ( !req.body.postId ) {
		return next( errors.blankData());
	}

	Post.findById( req.body.postId )
		.populate({
			path: "sharedPost author",
			select: "fullname username profileImage"
		})
		.exec()
		.then( post => res.send( post ))
		.catch( err => next( err ));
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
		token, userInput, alerts, hashtags, privacyRange, mentions
	} = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		newPost = await new Post({
			author: user._id,
			content: userInput,
			alerts: alerts,
			hashtags: hashtags,
			privacyRange: privacyRange
		}).save();
		newPost = await newPost.populate({
			path: "author",
			select: "fullname username profileImage"
		}).execPopulate();

		User.update(
			{ _id: { $in: user.friends } },
			{ $push: { "newsfeed": newPost._id } },
			{ multi: true }
		).exec();

		if ( privacyRange >= 2 ) {
			User.update(
				{ _id: { $in: user.followers } },
				{ $push: { "newsfeed": newPost._id } },
				{ multi: true }
			).exec();
		}
		user.posts.push( newPost._id );
		user.newsfeed.push( newPost._id );
		await user.save();

		mentionsNotifications = await notifyMentions(
			mentions, "post", newPost, user );
		res.status( 201 );
		res.send({
			newPost: newPost,
			mentionsNotifications: mentionsNotifications
		});
	} catch ( err ) {
		return next( err );
	}
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
		userId = await tokenVerifier( token );
		post = await Post.findById( postId ).exec();
		if ( !post ) {
			return next( errors.postDoesntExist());
		}
		if ( post.link ) {
			mediaImg = post.linkContent.image;
		} else {
			mediaImg = post.mediaContent.image;
		}
		user = await User.findById( userId )
			.select( "username fullname profileImage" )
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !post.likedBy.includes( user.username )) {
			post.likedBy.push( user.username );
		}
		post.save();
		postAuthor = await User.findById( post.author ).exec();
		postAuthor.totalLikes += 1;
		if ( postAuthor.username !== user.username ) {
			newNotification = await new Notification({
				author: user._id,
				receiver: postAuthor._id,
				content: "liked your post",
				mediaImg: mediaImg,
				externalImg: !post.picture,
				object: post._id
			}).save();
			postAuthor.notifications.push( newNotification );
			newNotification.author = user;
		}
		postAuthor.save();
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
		userId = await tokenVerifier( token );
		post = await Post.findById( postId ).exec();
		postAuthor = await User.findById( post.author ).exec();
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( !post ) {
			return next( errors.postDoesntExist());
		}
		if ( postAuthor && postAuthor.totalLikes > 0 ) {
			postAuthor.totalLikes -= 1;
			postAuthor.save();
		}
		if ( post.likedBy.includes( user.username )) {
			const index = post.likedBy.indexOf( user.username );
			post.likedBy.splice( index, 1 );
		}
		post.save();
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
		mentionsNotifications;

	if ( !req.body.token || !req.body.data || !req.body.data.privacyRange ||
			!req.body.data.alerts ) {
		return next( errors.blankData());
	}
	const { data, token } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		newPost = await new Post({
			author: user._id,
			media: true,
			link: !!data.link,
			content: data.content,
			alerts: data.alerts,
			hashtags: data.hashtags,
			privacyRange: data.privacyRange,
			mediaContent: {
				title: data.title,
				artist: data.artist,
				image: data.image
			}
		}).save();
		newPost = await newPost.populate({
			path: "author",
			select: "fullname username profileImage"
		}).execPopulate();
		User.update(
			{ _id: { $in: user.friends } },
			{ $push: { "newsfeed": newPost._id } },
			{ multi: true }
		).exec();
		if ( data.privacyRange >= 2 ) {
			User.update(
				{ _id: { $in: user.followers } },
				{ $push: { "newsfeed": newPost._id } },
				{ multi: true }
			).exec();
		}
		user.posts.push( newPost._id );
		user.newsfeed.push( newPost._id );
		await user.save();
		mentionsNotifications = await notifyMentions(
			data.mentions, "post", newPost, user );
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
		mentionsNotifications;

	if ( !req.body.token || !req.body.link ) {
		return next( errors.blankData());
	}

	const {
		token, link, mentions, description, alerts, hashtags, privacyRange
	} = req.body;

	try {
		userId = await tokenVerifier( token );
		previewData = await LinkPreview.getPreview( link );
		hostname = await extractHostname( previewData.url );
		if ( hostname === "www.youtube.com" ) {
			embeddedUrl = previewData.url.replace( "watch?v=", "embed/" );
		}
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		newPost = await new Post({
			author: user._id,
			media: true,
			link: true,
			content: description,
			alerts: alerts,
			hashtags: hashtags,
			privacyRange: privacyRange,
			linkContent: {
				url: previewData.url,
				embeddedUrl: embeddedUrl,
				hostname: hostname,
				title: previewData.title,
				description: previewData.description,
				image: previewData.images[ 0 ]
			}
		}).save();
		newPost = await newPost.populate({
			path: "author",
			select: "fullname username profileImage"
		}).execPopulate();

		User.update(
			{ _id: { $in: user.friends } },
			{ $push: { "newsfeed": newPost._id } },
			{ multi: true }
		).exec();

		if ( privacyRange >= 2 ) {
			User.update(
				{ _id: { $in: user.followers } },
				{ $push: { "newsfeed": newPost._id } },
				{ multi: true }
			).exec();
		}

		user.posts.push( newPost._id );
		user.newsfeed.push( newPost._id );
		user.save();

		mentionsNotifications = await notifyMentions(
			mentions, "post", newPost, user );
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
		mentions = [],
		hashtags = [],
		data,
		newPost,
		mentionsNotifications,
		user,
		userId;

	if ( !req.body.token || !req.body || !req.file ) {
		return next( errors.blankData());
	}

	data = req.body;

	if ( data.mentions.length > 1 ) {
		mentions = data.mentions.split( "," );
	} else if ( data.mentions.length === 1 ) {
		mentions = data.mentions.split();
	}

	if ( data.hashtags.length > 1 ) {
		hashtags = data.hashtags.split( "," );
	} else if ( data.mentions.length === 1 ) {
		hashtags = data.hashtags.split();
	}

	try {
		userId = await tokenVerifier( data.token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		newPost = await new Post({
			author: user._id,
			media: true,
			picture: true,
			content: data.content,
			alerts: data.alerts,
			hashtags: hashtags,
			privacyRange: data.privacyRange,
			mediaContent: {
				image: req.file.filename,
			}
		}).save();
		newPost = await newPost.populate({
			path: "author",
			select: "fullname username profileImage"
		}).execPopulate();
		User.update(
			{ _id: { $in: user.friends } },
			{ $push: { "newsfeed": newPost._id } },
			{ multi: true }
		).exec();
		if ( data.privacyRange >= 2 ) {
			User.update(
				{ _id: { $in: user.followers } },
				{ $push: { "newsfeed": newPost._id } },
				{ multi: true }
			).exec();
		}
		user.posts.push( newPost._id );
		user.newsfeed.push( newPost._id );
		user.save();
		mentionsNotifications = await notifyMentions(
			mentions, "post", newPost, user	);
	} catch ( err ) {
		return next( err );
	}
	res.status( 201 );
	res.send({
		newPost: newPost,
		mentionsNotifications: mentionsNotifications
	});
});


Router.post( "/newsfeed/:skip", ( req, res, next ) => {
	var
		userId,
		token;

	if ( !req.body.token ) {
		return next( errors.blankData());
	}

	token = req.body.token;

	try {
		userId = tokenVerifier( token );
	} catch ( err ) {
		return next( err );
	}

	User.findById( userId )
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
					}
				}
			]
		})
		.exec()
		.then( user => {
			if ( !user ) {
				return next( errors.userDoesntExist());
			}
			res.send( user.newsfeed );
		}).catch( err => next( err ));
});

// user timeline
Router.post( "/:username/:skip", async( req, res, next ) => {
	var
		relationLvl,
		visitorId,
		user,
		filteredPosts;

	if ( !req.params.username || !req.params.skip || !req.body.token ) {
		return next( errors.blankData());
	}
	try {
		visitorId = await tokenVerifier( req.body.token );
		user = await User.findOne({ username: req.params.username })
			.populate({
				path: "posts",
				options: {
					limit: 10,
					skip: req.params.skip * 10,
					sort: { createdAt: -1 }
				},
				populate: {
					path: "sharedPost author",
					select: "fullname username profileImage"
				}
			})
			.exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		if ( user.friends.some( id => id.equals( visitorId ))
				|| user._id.equals( visitorId )) {
			relationLvl = 1;
		} else if ( user.followers.some( id => id.equals( visitorId ))) {
			relationLvl = 2;
		} else {
			relationLvl = 3;
		}
		filteredPosts = await user.posts.filter( post =>
			post.privacyRange >= relationLvl );
	} catch ( err ) {
		return next( err );
	}
	res.send( filteredPosts );
});


Router.delete( "/delete", ( req, res, next ) => {
	var post;

	if ( !req.body.post || !req.body.post.id ) {
		return next( errors.blankData());
	}

	post = req.body.post;

	try {
		userId = tokenVerifier( post.token );
	} catch ( err ) {
		return next( err );
	}

	User.findById( userId )
		.exec()
		.then( user => {
			if ( !user ) {
				return next( errors.userDoesntExist());
			}

			Post.findById( post.id )
				.exec()
				.then( storedPost => {
					if ( !storedPost ) {
						return next( errors.postDoesntExist());
					}
					if ( !user._id.equals( storedPost.author )) {
						return next( errors.unauthorized());
					}

					const
						postsIndex = user.posts.indexOf( storedPost.id ),
						newsfeedIndex = user.newsfeed.indexOf( storedPost.id );

					User.update(
						{ _id: { $in: user.friends } },
						{ $pull: { "newsfeed": storedPost.id } },
						{ multi: true }
					)
						.exec()
						.catch( err => next( err ));

					user.posts.splice( postsIndex, 1 );
					user.newsfeed.splice( newsfeedIndex, 1 );
					user.save()
						.then(() => {
							if ( storedPost.picture ) {
								const
									picPath = "../wanamic-frontend/src/images/",
									picFile = storedPost.mediaContent.image;
								fs.unlink( picPath + picFile, err => {
									if ( err ) {
										next( err );
									}
								});
							}
							storedPost.remove()
								.then(() => res.sendStatus( 200 ))
								.catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


Router.patch( "/update", ( req, res, next ) => {
	var
		updatedPost,
		token,
		userId;

	if ( !req.body.data || !req.body.data.post || !req.body.data.token
		|| !req.body.data.post.id || !req.body.data.post.content ) {
		return next( errors.blankData());
	}

	updatedPost = req.body.data.post;
	token = req.body.data.token;

	try {
		userId = tokenVerifier( token );
	} catch ( err ) {
		return next( err );
	}

	User.findById( userId )
		.exec()
		.then( user => {
			if ( !user ) {
				return next( errors.userDoesntExist());
			}

			Post.findById( updatedPost.id )
				.populate({ path: "sharedPost" })
				.exec()
				.then( storedPost => {
					if ( !user._id.equals( storedPost.author )) {
						return next( errors.unauthorized());
					}
					if ( updatedPost.content ) {
						storedPost.content = updatedPost.content;
					};
					storedPost.save()
						.then(() => res.send( storedPost ))
						.catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

Router.post( "/share", async( req, res, next ) => {
	var
		userId,
		user,
		postToShare,
		originalPost,
		newPost;

	if ( !req.body.postId || !req.body.token ) {
		return next( errors.blankData());
	}

	const { postId, token, description } = req.body;

	try {
		userId = await tokenVerifier( token );
		user = await User.findById( userId ).exec();
		if ( !user ) {
			return next( errors.userDoesntExist());
		}
		postToShare = await Post.findById( postId )
			.populate( "sharedPost" )
			.populate({
				path: "author",
				select: "username fullname profileImage"
			})
			.exec();
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
			sharedPost: originalPost._id
		}).save();

		User.update(
			{ _id: { $in: user.friends } },
			{ $push: { "newsfeed": newPost._id } },
			{ multi: true }
		).exec();

		user.posts.push( newPost._id );
		user.newsfeed.push( newPost._id );
		user.save();

		if ( !postToShare.sharedBy.includes( String( user._id ))) {
			postToShare.sharedBy.push( user._id );
			postToShare.save();
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
	res.send({ newPost: newPost, postToShare: postToShare });
});


module.exports = Router;
