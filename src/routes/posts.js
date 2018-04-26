const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	tokenVerifier = require( "../utils/tokenVerifier" ),
	Post = require( "../models/Post" ),
	LinkPreview = require( "react-native-link-preview" ),
	extractHostname = require( "../utils/extractHostname" ),
	multer = require( "multer" ),
	upload = multer({ dest: "../wanamic-frontend/src/images" });


// POST
Router.post( "/create", ( req, res, next ) => {
	var
		err,
		data,
		userId;

	if ( !req.body.post || !req.body.post.token || !req.body.post.content ) {
		err = new Error( "Empty post data" );
		err.statusCode = 422;
		return next( err );
	}

	data = req.body.post;

	try {
		userId = tokenVerifier( data.token );
	} catch ( err ) {
		return next( err );
	}

	User.findById( userId )
		.exec()
		.then( user => {
			if ( !user ) {
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
			}
			new Post({
				author: user.username,
				content: data.content
			}).save()
				.then( post => {

					User.update(
						{ _id: { $in: user.friends } },
						{ $push: { "newsfeed": post._id } },
						{ multi: true }
					)
						.exec()
						.catch( err => next( err ));

					user.posts.push( post._id );
					user.newsfeed.push( post._id );
					user.save()
						.then( updatedUser => {
							res.sendStatus( 201 );
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

Router.post( "/media", ( req, res, next ) => {
	var
		err,
		data,
		token,
		userId;

	if ( !req.body.token || !req.body.data ) {
		err = new Error( "Empty post data" );
		err.statusCode = 422;
		return next( err );
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
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
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
				.then( post => {

					User.update(
						{ _id: { $in: user.friends } },
						{ $push: { "newsfeed": post._id } },
						{ multi: true }
					)
						.exec()
						.catch( err => next( err ));

					user.posts.push( post._id );
					user.newsfeed.push( post._id );
					user.save()
						.then( updatedUser => {
							res.sendStatus( 201 );
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

Router.post( "/mediaLink", ( req, res, next ) => {
	var
		err,
		data,
		token,
		userId,
		hostname,
		embeddedUrl;

	if ( !req.body.token || !req.body.data || !req.body.data.link ) {
		err = new Error( "Empty post data" );
		err.statusCode = 422;
		return next( err );
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
						err = new Error( "User doesn't exist" );
						err.statusCode = 404;
						return next( err );
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
						.then( post => {

							User.update(
								{ _id: { $in: user.friends } },
								{ $push: { "newsfeed": post._id } },
								{ multi: true }
							)
								.exec()
								.catch( err => next( err ));

							user.posts.push( post._id );
							user.newsfeed.push( post._id );
							user.save()
								.then( updatedUser => {
									res.sendStatus( 201 );
								}).catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => console.log( err ));
});

Router.post( "/mediaPicture", upload.single( "picture" ), ( req, res, next ) => {
	var
		err,
		data,
		userId;

	if ( !req.body.token || !req.body || !req.file ) {
		err = new Error( "Empty data" );
		err.statusCode = 422;
		return next( err );
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
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
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
				.then( post => {

					User.update(
						{ _id: { $in: user.friends } },
						{ $push: { "newsfeed": post._id } },
						{ multi: true }
					)
						.exec()
						.catch( err => next( err ));

					user.posts.push( post._id );
					user.newsfeed.push( post._id );
					user.save()
						.then( updatedUser => {
							res.sendStatus( 201 );
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});

Router.post( "/newsfeed/:skip", ( req, res, next ) => {
	var
		err,
		userId,
		token;

	if ( !req.body.token ) {
		err = new Error( "Missing token" );
		err.statusCode = 422;
		return next( err );
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
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
			}
			res.send( user.newsfeed );
		})
		.catch( err => next( err ));
});


// GET
Router.get( "/:username/:skip", ( req, res, next ) => {
	var
		err;

	if ( !req.params.username || !req.params.skip ) {
		err = new Error( "Empty params" );
		err.statusCode = 422;
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
		.then( user => {
			if ( !user ) {
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
			}
			res.send( user.posts );
		})
		.catch( err => next( err ));
});


// DELETE
Router.delete( "/delete", ( req, res, next ) => {
	var
		post,
		err;

	if ( !req.body.post || !req.body.post.id ) {
		err = new Error( "Empty data" );
		err.statusCode = 422;
		return next( err );
	}

	post = req.body.post;

	try {
		userId = tokenVerifier( post.token );
	} catch ( err ) {
		return next( err );
	}

	// find the requester and the post, if the requester isn't the author of the post
	// throw an error, else update
	User.findById( userId )
		.exec()
		.then( user => {
			if ( !user ) {
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
			}

			Post.findById( post.id )
				.exec()
				.then( storedPost => {
					if ( !storedPost ) {
						err = new Error( "Post doesn't exist" );
						err.statusCode = 404;
						return next( err );
					}

					if ( user.username !== storedPost.author ) {
						err = new Error( "Requester isn't the author" );
						err.statusCode = 401;
						return next( err );
					}

					Post.remove({ _id: post.id })
						.exec()
						.then(() => {
							// get the index of the post in posts and newsfeed
							const
								postsIndex = user.posts.indexOf( storedPost._id ),
								newsfeedIndex = user.posts.indexOf( storedPost._id );

							// remove the post from the friends newsfeed
							User.update(
								{ _id: { $in: user.friends } },
								{ $pull: { "newsfeed": post.id } },
								{ multi: true }
							)
								.exec()
								.catch( err => next( err ));

							// remove the post from user posts/newsfeed
							user.posts.splice( postsIndex, 1 );
							user.newsfeed.splice( newsfeedIndex, 1 );
							user.save()
								.then(() => res.sendStatus( 200 ))
								.catch( err => next( err ));
						}).catch( err => next( err ));
				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


// PATCH
Router.patch( "/update", ( req, res, next ) => {
	var
		updatedPost,
		token,
		userId,
		err;

	if ( !req.body.data || !req.body.data.post || !req.body.data.token
		|| !req.body.data.post.id || !req.body.data.post.content ) {
		err = new Error( "Empty data" );
		err.statusCode = 422;
		return next( err );
	}

	updatedPost = req.body.data.post;
	token = req.body.data.token;

	try {
		userId = tokenVerifier( token );
	} catch ( err ) {
		return next( err );
	}

	// find the requester and the post, if the requester isn't the author of the post
	// throw an error, else update
	User.findById( userId )
		.exec()
		.then( user => {
			if ( !user ) {
				err = new Error( "User doesn't exist" );
				err.statusCode = 404;
				return next( err );
			}

			Post.findById( updatedPost.id )
				.exec()
				.then( storedPost => {

					if ( user.username !== storedPost.author ) {
						err = new Error( "Requester isn't the author" );
						err.statusCode = 401;
						return next( err );
					}
					if ( updatedPost.content ) {
						storedPost.content = updatedPost.content;
					};
					storedPost.save().then(() => res.sendStatus( 200 ));

				}).catch( err => next( err ));
		}).catch( err => next( err ));
});


module.exports = Router;
