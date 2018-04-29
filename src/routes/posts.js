const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	Post = require( "../models/Post" ),
	LinkPreview = require( "react-native-link-preview" ),
	extractHostname = require( "../utils/extractHostname" ),
	multer = require( "multer" ),
	upload = multer({ dest: "../wanamic-frontend/src/images" }),
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
				content: data.post
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
						.then(() => res.sendStatus( 201 ))
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
						.then(() => res.sendStatus( 201 ))
						.catch( err => next( err ));
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

	if ( !req.body.token || !req.body.data ) {
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

					user.posts.push( newPost._id );
					user.newsfeed.push( newPost._id );
					user.save()
						.then( updatedUser => res.sendStatus( 201 ))
						.catch( err => next( err ));
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

							user.posts.push( newPost._id );
							user.newsfeed.push( newPost._id );
							user.save()
								.then( updatedUser => res.sendStatus( 201 ))
								.catch( err => next( err ));
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

					user.posts.push( newPost._id );
					user.newsfeed.push( newPost._id );
					user.save()
						.then( updatedUser => res.sendStatus( 201 ))
						.catch( err => next( err ));
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

					Post.remove({ _id: post.id })
						.exec()
						.then(() => {
							const
								postsIndex = user.posts.indexOf( storedPost._id ),
								newsfeedIndex = user.posts.indexOf( storedPost._id );

							User.update(
								{ _id: { $in: user.friends } },
								{ $pull: { "newsfeed": post.id } },
								{ multi: true }
							)
								.exec()
								.catch( err => next( err ));

							user.posts.splice( postsIndex, 1 );
							user.newsfeed.splice( newsfeedIndex, 1 );
							user.save()
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
				.exec()
				.then( storedPost => {
					if ( user.username !== storedPost.author ) {
						return next( errors.unauthorized());
					}
					if ( updatedPost.content ) {
						storedPost.content = updatedPost.content;
					};
					storedPost.save()
						.then(() => res.sendStatus( 200 ))
						.catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


module.exports = Router;
