/////////////////////////////////////////////////////////////////////
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

function WebhookNodeSelected(node) {
  if (node.type !== 'folders') return;
  updateCurrentMonitor(node);
}

function updateCurrentMonitor(node) {
  $('#startMonitorFolder').hide();
  $('#stopMonitorFolder').hide();
  jQuery.ajax({
    url: '/api/aps/webhook?href=' + node.id,
    success: function (res) {
      if (res.length == 0)
        $('#startMonitorFolder').show();
      else
        $('#stopMonitorFolder').show();
    }
  });
}

$(document).ready(function () {
  $('#startMonitorFolder').hide();
  $('#stopMonitorFolder').hide();

  $('#startMonitorFolder').click(function () {
    var node = $("#userHubs").jstree("get_selected", true);
    if (node.length != 1 || node[0].type !== 'folders') return;
    var hubId = '';
    var re = /hubs\/(.*)\/projects\//;
    node[0].parents.forEach(p => {
      if (p.match(re))
        hubId = p.match(re)[1];
    });
    $.ajax({
      type: "POST",
      url: '/api/aps/webhook',
      data: { hubId: hubId, href: node[0].id },
      success: function (res) {
        updateCurrentMonitor(node[0]);
      }
    });
  });

  $('#stopMonitorFolder').click(function () {
    var node = $("#userHubs").jstree("get_selected", true);
    if (node.length != 1 || node[0].type !== 'folders') return;
    $.ajax({
      type: "DELETE",
      url: '/api/aps/webhook',
      data: { href: node[0].id },
      success: function (res) {
        updateCurrentMonitor(node[0]);
      }
    });
  });
});