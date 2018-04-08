const
	Router = require( "express" ).Router(),
	User = require( "../models/User" ),
	jwt = require( "jsonwebtoken" ),
	Post = require( "../models/Post" );

Router.post( "/create", ( req, res, next ) => {
	var
		err,
		data,
		userId,
		username;

	if ( !req.body.post || !req.body.post.token || !req.body.post.content ) {
		err = new Error( "Empty post data" );
		err.statusCode = 422;
		return next( err );
	}

	data = req.body.post;

	try {
		userId = jwt.verify( data.token, process.env.SECRET_JWT );
	} catch ( err ) {
		err.statusCode = 401;
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
				author: user.email,
				content: data.content
			}).save()
				.then( post => {
					user.posts.push( post._id );
					user.save();
					res.sendStatus( 201 );
				})
				.catch( err => next( err ));
		}).catch( err => next( err ));
});


Router.get( "/:username/:skip", ( req, res, next ) => {
	var
		err;

	if ( !req.params.username || !req.params.skip ) {
		err = new Error( "User doesn't exist" );
		err.statusCode = 404;
		return next( err );
	}

	User.findOne({ email: req.params.username })
		.populate({
			path: "posts",
			options: {
				limit: 10,
				skip: req.params.skip * 10,
				sort: { createdAt: -1 }
			}
		})
		.exec()
		.then( user => res.send( user.posts ))
		.catch( err => next( err ));
});

Router.delete( "/delete", ( req, res, next ) => {
	var
		post,
		err;

	if ( !req.body.post || !req.body.post.id ) {
		err = new Error( "Empty post data" );
		err.statusCode = 422;
		return next( err );
	}

	post = req.body.post;

	try {
		// get userId from token
		userId = jwt.verify( post.token, process.env.SECRET_JWT );
	} catch ( err ) {
		err.statusCode = 401;
		return next( err );
	}

	// find the requester and the post, if the requester isn't the author of the post
	// throw an error, else update
	User.findById( userId )
		.exec()
		.then( user => {

			Post.findById( post.id )
				.exec()
				.then( storedPost => {

					if ( user.email !== storedPost.author ) {
						err = new Error( "Requester isn't the author" );
						err.statusCode = 401;
						return next( err );
					}

					Post.remove({ _id: post.id })
						.exec()
						.then(() => {
							// remove the post from user posts (find index and remove with splice)
							const index = user.posts.indexOf( storedPost._id );
							user.posts.splice( index, 1 );
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
		// get userId from token
		userId = jwt.verify( token, process.env.SECRET_JWT );
	} catch ( err ) {
		err.statusCode = 401;
		return next( err );
	}

	// find the requester and the post, if the requester isn't the author of the post
	// throw an error, else update
	User.findById( userId )
		.exec()
		.then( user => {

			Post.findById( updatedPost.id )
				.exec()
				.then( storedPost => {

					if ( user.email !== storedPost.author ) {
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
