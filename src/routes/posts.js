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

Router.get( "/explore/:skip", ( req, res, next ) => {

	if ( !req.params.skip ) {
		return next( errors.blankData());
	}

	Post.find()
		.where( "media" ).equals( true )
		.limit( 10 )
		.skip( req.params.skip * 10 )
		.sort( "-createdAt" )
		.exec()
		.then( posts => res.send( posts ))
		.catch( err => next( err ));
});

Router.post( "/getPost", ( req, res, next ) => {

	if ( !req.body.postId ) {
		return next( errors.blankData());
	}

	Post.findById( req.body.postId )
		.exec()
		.then( post => res.send( post ))
		.catch( err => next( err ));
});

Router.post( "/create", ( req, res, next ) => {
	var
		data,
		userId;

	if ( !req.body.token || !req.body.userInput ) {
		return next( errors.blankData());
	}

	data = req.body;

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
			new Post({
				author: user.username,
				authorFullname: user.fullname,
				authorImg: user.profileImage,
				content: data.userInput,
				alerts: data.alerts,
				hashtags: data.hashtags,
				privacyRange: data.privacyRange
			}).save()
				.then( newPost => {
					User.update(
						{ _id: { $in: user.friends } },
						{ $push: { "newsfeed": newPost._id } },
						{ multi: true }
					)
						.exec()
						.catch( err => next( err ));

					if ( data.privacyRange >= 2 ) {
						User.update(
							{ _id: { $in: user.followers } },
							{ $push: { "newsfeed": newPost._id } },
							{ multi: true }
						)
							.exec()
							.catch( err => next( err ));
					}

					user.posts.push( newPost._id );
					user.newsfeed.push( newPost._id );
					user.save()
						.then(() => {
							notifyMentions( data.mentions, "post", newPost, user )
								.then( mentionsNotifications => {
									res.status( 201 );
									res.send({
										newPost: newPost,
										mentionsNotifications: mentionsNotifications
									});
								}).catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


Router.post( "/like", ( req, res, next ) => {
	var
		mediaImg,
		data,
		userId;

	if ( !req.body.token || !req.body.postId ) {
		return next( errors.blankData());
	}

	data = req.body;

	try {
		userId = tokenVerifier( data.token );
	} catch ( err ) {
		return next( err );
	}

	Post.findById( data.postId )
		.exec()
		.then( post => {
			if ( !post ) {
				return next( errors.postDoesntExist());
			}
			if ( post.link ) {
				mediaImg = post.linkContent.image;
			} else {
				mediaImg = post.mediaContent.image;
			}

			User.findById( userId )
				.then( user => {
					if ( !post.likedBy.includes( user.username )) {
						post.likedBy.push( user.username );
					}
					post.save()

						.then( post => {
							User.findOne({ username: post.author })
								.exec()
								.then( postAuthor => {
									if ( postAuthor.username !== user.username ) {
										new Notification({
											author: user.username,
											authorFullname: user.fullname,
											authorImg: user.profileImage,
											receiver: postAuthor.username,
											content: "liked your post",
											mediaImg: mediaImg,
											externalImg: !post.picture,
											object: post._id
										}).save()
											.then( newNotification => {
												postAuthor.notifications.push( newNotification );
												postAuthor.save();
												res.status( 201 );
												res.send( newNotification );

											}).catch( err => next( err ));
									} else {
										res.sendStatus( 201 );
									}
								}).catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


Router.patch( "/dislike", ( req, res, next ) => {
	var
		data,
		userId;

	if ( !req.body.token || !req.body.postId ) {
		return next( errors.blankData());
	}

	data = req.body;

	try {
		userId = tokenVerifier( data.token );
	} catch ( err ) {
		return next( err );
	}

	Post.findById( data.postId )
		.exec()
		.then( post => {
			if ( !post ) {
				return next( errors.postDoesntExist());
			}
			User.findById( userId )
				.then( user => {
					if ( post.likedBy.includes( user.username )) {
						const index = post.likedBy.indexOf( user.username );
						post.likedBy.splice( index, 1 );
					}
					post.save()
						.then(() => res.sendStatus( 200 ))
						.catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


Router.post( "/media", ( req, res, next ) => {
	var
		data,
		token,
		userId;

	if ( !req.body.token || !req.body.data || !req.body.data.privacyRange ||
			!req.body.data.alerts ) {
		return next( errors.blankData());
	}

	data = req.body.data;
	token = req.body.token;

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
			new Post({
				author: user.username,
				authorFullname: user.fullname,
				authorImg: user.profileImage,
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
			}).save()
				.then( newPost => {
					User.update(
						{ _id: { $in: user.friends } },
						{ $push: { "newsfeed": newPost._id } },
						{ multi: true }
					)
						.exec()
						.catch( err => next( err ));

					if ( data.privacyRange >= 2 ) {
						User.update(
							{ _id: { $in: user.followers } },
							{ $push: { "newsfeed": newPost._id } },
							{ multi: true }
						)
							.exec()
							.catch( err => next( err ));
					}

					user.posts.push( newPost._id );
					user.newsfeed.push( newPost._id );
					user.save()
						.then(() => {
							notifyMentions( data.mentions, "post", newPost, user )
								.then( mentionsNotifications => {
									res.status( 201 );
									res.send({
										newPost: newPost,
										mentionsNotifications: mentionsNotifications
									});
								}).catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

Router.post( "/mediaLink", ( req, res, next ) => {
	var
		data,
		token,
		userId,
		hostname,
		embeddedUrl;

	if ( !req.body.token || !req.body.link ) {
		return next( errors.blankData());
	}

	data = req.body;

	try {
		userId = tokenVerifier( data.token );
	} catch ( err ) {
		return next( err );
	}

	LinkPreview.getPreview( data.link )
		.then( previewData => {
			hostname = extractHostname( previewData.url );
			if ( hostname === "www.youtube.com" ) {
				embeddedUrl = previewData.url.replace( "watch?v=", "embed/" );
			}
			User.findById( userId )
				.exec()
				.then( user => {
					if ( !user ) {
						return next( errors.userDoesntExist());
					}
					new Post({
						author: user.username,
						authorFullname: user.fullname,
						authorImg: user.profileImage,
						media: true,
						link: true,
						content: data.description,
						alerts: data.alerts,
						hashtags: data.hashtags,
						privacyRange: data.privacyRange,
						linkContent: {
							url: previewData.url,
							embeddedUrl: embeddedUrl,
							hostname: hostname,
							title: previewData.title,
							description: previewData.description,
							image: previewData.images[ 0 ]
						}
					}).save()
						.then( newPost => {
							User.update(
								{ _id: { $in: user.friends } },
								{ $push: { "newsfeed": newPost._id } },
								{ multi: true }
							)
								.exec()
								.catch( err => next( err ));

							if ( data.privacyRange >= 2 ) {
								User.update(
									{ _id: { $in: user.followers } },
									{ $push: { "newsfeed": newPost._id } },
									{ multi: true }
								)
									.exec()
									.catch( err => next( err ));
							}

							user.posts.push( newPost._id );
							user.newsfeed.push( newPost._id );
							user.save()
								.then(() => {
									notifyMentions( data.mentions, "post", newPost, user )
										.then( mentionsNotifications => {
											res.status( 201 );
											res.send({
												newPost: newPost,
												mentionsNotifications: mentionsNotifications
											});
										}).catch( err => next( err ));
								}).catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => console.log( err ));
});

Router.post( "/mediaPicture", upload.single( "picture" ), ( req, res, next ) => {
	var
		mentions = [],
		hashtags = [],
		data,
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
			new Post({
				author: user.username,
				authorFullname: user.fullname,
				authorImg: user.profileImage,
				media: true,
				picture: true,
				content: data.content,
				alerts: data.alerts,
				hashtags: hashtags,
				privacyRange: data.privacyRange,
				mediaContent: {
					image: req.file.filename,
				}
			}).save()
				.then( newPost => {
					User.update(
						{ _id: { $in: user.friends } },
						{ $push: { "newsfeed": newPost._id } },
						{ multi: true }
					)
						.exec()
						.catch( err => next( err ));

					if ( data.privacyRange >= 2 ) {
						User.update(
							{ _id: { $in: user.followers } },
							{ $push: { "newsfeed": newPost._id } },
							{ multi: true }
						)
							.exec()
							.catch( err => next( err ));
					}

					user.posts.push( newPost._id );
					user.newsfeed.push( newPost._id );
					user.save()
						.then(() => {
							notifyMentions( mentions, "post", newPost, user	)
								.then( mentionsNotifications => {
									res.status( 201 );
									res.send({
										newPost: newPost,
										mentionsNotifications: mentionsNotifications
									});
								}).catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
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
			populate: {
				path: "sharedPost"
			}
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
Router.post( "/:username/:skip", ( req, res, next ) => {
	var
		relationLvl,
		visitorId;

	if ( !req.params.username || !req.params.skip || !req.body.token ) {
		return next( errors.blankData());
	}

	try {
		visitorId = tokenVerifier( req.body.token );
	} catch ( err ) {
		return next( err );
	}

	User.findOne({ username: req.params.username })
		.populate({
			path: "posts",
			options: {
				limit: 10,
				skip: req.params.skip * 10,
				sort: { createdAt: -1 }
			}
		})
		.exec()
		.then( async user => {
			if ( !user ) {
				return next( errors.userDoesntExist());
			}

			if ( user.friends.some( id => id.equals( visitorId ))) {
				relationLvl = 1;
			} else if ( user.followers.some( id => id.equals( visitorId ))) {
				relationLvl = 2;
			} else {
				relationLvl = 3;
			}

			const filteredPosts = await user.posts.filter( post =>
				post.privacyRange >= relationLvl
			);
			res.send( filteredPosts );
		}).catch( err => next( err ));
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

					if ( user.username !== storedPost.author ) {
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
					if ( user.username !== storedPost.author ) {
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

Router.post( "/share", ( req, res, next ) => {
	var
		userId,
		clickedPostId;

	if ( !req.body.postId || !req.body.token ) {
		return next( errors.blankData());
	}

	clickedPostId = req.body.postId;

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
			Post.findById( clickedPostId )
				.populate( "sharedPost" )
				.exec()
				.then( clickedPost => {
					var originalPost;
					if ( !clickedPost ) {
						return next( errors.postDoesntExist());
					}

					if ( clickedPost.sharedPost ) {
						originalPost = clickedPost.sharedPost;
					} else {
						originalPost = clickedPost;
					}

					new Post({
						author: user.username,
						authorFullname: user.fullname,
						content: req.body.shareComment,
						sharedPost: originalPost._id
					}).save()
						.then( newPost => {
							User.update(
								{ _id: { $in: user.friends } },
								{ $push: { "newsfeed": newPost._id } },
								{ multi: true }
							)
								.exec()
								.catch( err => next( err ));

							user.posts.push( newPost._id );
							user.newsfeed.push( newPost._id );
							user.save()
								.then(() => {
									if ( !clickedPost.sharedBy.includes( user.username )) {
										clickedPost.sharedBy.push( user.username );
										clickedPost.save();
									}
									newPost.sharedPost = originalPost;
									res.status( 201 );
									res.send({ newPost: newPost, clickedPost: clickedPost });
								}).catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


module.exports = Router;
