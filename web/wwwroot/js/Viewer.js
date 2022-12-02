﻿/////////////////////////////////////////////////////////////////////
// Copyright (c) Autodesk, Inc. All rights reserved
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
/////////////////////////////////////////////////////////////////////

var viewerApp;

function launchViewer(urn, viewableId, cb) {
  if (viewerApp != null) {
    var thisviewer = viewerApp.getCurrentViewer();
    if (thisviewer) {
      thisviewer.tearDown()
      thisviewer.finish()
      thisviewer = null
      $("#Viewer").empty();
    }
  }

  var options = {
    env: 'AutodeskProduction',
    getAccessToken: getToken
  };
  var documentId = 'urn:' + urn;
  Autodesk.Viewing.Initializer(options, function onInitialized() {
    viewerApp = new Autodesk.Viewing.ViewingApplication('Viewer');
    viewerApp.registerViewer(viewerApp.k3D, Autodesk.Viewing.Private.GuiViewer3D);
    viewerApp.loadDocument(documentId, function (doc) {
      // We could still make use of Document.getSubItemsWithProperties()
      // However, when using a ViewingApplication, we have access to the **bubble** attribute,
      // which references the root node of a graph that wraps each object from the Manifest JSON.
      var viewables = viewerApp.bubble.search({ 'type': 'geometry' });
      if (viewables.length === 0) {
        console.error('Document contains no viewables.');
        return;
      }

      if (viewableId !== undefined) {
        viewables.forEach(function (viewable) {
          if (viewable.data.viewableID == viewableId)
            viewerApp.selectItem(viewable.data, cb, onItemLoadFail);
        });
      }
      else
        viewerApp.selectItem(viewables[0].data, cb, onItemLoadFail);
    }, onDocumentLoadFailure);
  });
}

function onDocumentLoadFailure(viewerErrorCode) {
  console.error('onDocumentLoadFailure() - errorCode:' + viewerErrorCode);
}

function onItemLoadSuccess(viewer, item) {
  // item loaded, any custom action?
}

function onItemLoadFail(errorCode) {
  console.error('onItemLoadFail() - errorCode:' + errorCode);
}

function getToken(callback) {
  jQuery.ajax({
    url: '/api/aps/oauth/token',
    success: function (res) {
      callback(res.access_token, res.expires_in)
    }
  });
}