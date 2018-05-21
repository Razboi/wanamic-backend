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
	errors = require( "../utils/errors" );

Router.post( "/explore/:skip", ( req, res, next ) => {
	var userId;

	if ( !req.body.token || !req.params.skip ) {
		return next( errors.blankData());
	}

	data = req.body;

	try {
		userId = tokenVerifier( data.token );
	} catch ( err ) {
		return next( err );
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

	if ( !req.body.token || !req.body.post ) {
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
				content: data.post,
				alerts: data.alerts,
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
							res.status( 201 );
							res.send( newPost );
						})
						.catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


Router.post( "/like", ( req, res, next ) => {
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
											receiver: postAuthor.username,
											content: "liked your post",
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
				media: true,
				link: !!data.link,
				content: data.content,
				alerts: data.alerts,
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
						.then( updatedUser => {
							res.status( 201 );
							res.send( newPost );
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

	if ( !req.body.token || !req.body.data || !req.body.data.link ) {
		return next( errors.blankData());
	}

	data = req.body.data;
	token = req.body.token;

	try {
		userId = tokenVerifier( token );
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
						media: true,
						link: true,
						content: data.content,
						alerts: data.alerts,
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
									res.status( 201 );
									res.send( newPost );
								}).catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => console.log( err ));
});

Router.post( "/mediaPicture", upload.single( "picture" ), ( req, res, next ) => {
	var
		data,
		userId;

	if ( !req.body.token || !req.body || !req.file ) {
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
				media: true,
				picture: true,
				content: data.content,
				alerts: data.alerts,
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
							res.status( 201 );
							res.send( newPost );
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


Router.get( "/:username/:skip", ( req, res, next ) => {

	if ( !req.params.username || !req.params.skip ) {
		return next( errors.blankData());
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
		.then( user => {
			if ( !user ) {
				return next( errors.userDoesntExist());
			}
			res.send( user.posts );
		}).catch( err => next( err ));
});


Router.delete( "/delete", ( req, res, next ) => {
	var
		updatedOriginalPost,
		post;

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
					// if its a shared post remove it from the originalPost sharedBy
					if ( storedPost.sharedPost ) {
						Post.findById( storedPost.sharedPost )
							.then( originalPost => {
								if ( originalPost ) {
									const
										sharedByIndex = originalPost.sharedBy.indexOf( user.username );
									originalPost.sharedBy.splice( sharedByIndex, 1 );
									originalPost.save()
										.then( originalPost => updatedOriginalPost = originalPost )
										.catch( err => console.log( err ));
								}
							}).catch( err => console.log( err ));
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
							storedPost.remove()
								.then(() => {
									if ( updatedOriginalPost ) {
										res.send({ updatedOriginalPost: updatedOriginalPost });
									} else {
										res.sendStatus( 200 );
									}
								}).catch( err => next( err ));
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
		token,
		postId;

	if ( !req.body.postId || !req.body.token ) {
		return next( errors.blankData());
	}

	postId = req.body.postId;
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
				content: req.body.shareComment,
				sharedPost: postId
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

							Post.findById( postId )
								.exec()
								.then( sharedPost => {
									if ( !sharedPost ) {
										return next( errors.postDoesntExist());
									}
									if ( !sharedPost.sharedBy.includes( user.username )) {
										sharedPost.sharedBy.push( user.username );
										sharedPost.save();
									}
									res.status( 201 );
									newPost.sharedPost = sharedPost;
									res.send( newPost );
								}).catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


module.exports = Router;
