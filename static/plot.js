

  var catCounter = {};
  var ignoreLower = 0.01;
  var hidePyFiles = false;
  var currentLayer = 'top';
  var pad = 50,
      width  = $(window).width() - pad,
      height = $(window).height() - pad,
      radius = -50 + (Math.min(width, height) / 2);
  var svg, path, arc, partition;

  var x = d3.scale.linear().range([0, 2 * Math.PI]);
  var y = d3.scale.sqrt().range([0, radius]);

  $(document).ready(function() {

    $('#setting-threshold').on('input',function() {
      ignoreLower = Math.min(Math.max(1,$(this).val()),99) / 100; console.log(ignoreLower);
    });
    $('#setting-hide-py').change(function(e) {
      hidePyFiles = $(this).prop('checked');
      console.log(hidePyFiles);
    });
    $('#button-apply-settings').click(applySettings);
    // Draw the chart
    draw();
  });


  var draw = function() {
    $.getJSON('http://cdn.pychart.io/other/pymix-data-1.json', function(data) {


      var color = function(d) {
        var scale = cat2col(d.cat)
        return (d.children) ? scale(0).hex() : scale(d.counter/catCounter[d.cat]).hex();
      };

      svg = d3.select("#plot-pie")
        .append("svg")
          .attr("id", "msvg")
          .attr("width", '100%')
          .attr("height", '100%')
          .attr("preserveAspectRatio", "xMinYMin meet")
          .attr("viewBox", "0 0 "+Math.min(width,height) +' '+Math.min(width,height))
          .classed("svg-content-responsive", true)
        .append("g")
          .attr("transform", "scale(0)translate(" + width / 2 + "," + (height / 2) + ")");

        svg.transition()
          .duration(750)
          .attr("transform", "scale(1)translate(" + width / 2 + "," + (height / 2) + ")")

        // d3.select(window).on('resize', function() {
        //     var w  = $(window).width()- pad,
        //         h = $(window).height()- pad;
        //     svg.attr("transform", "translate(" + w / 2 + "," + (h / 2) + ")");
        // })

      partition = d3.layout.partition()
          .sort(null)
          .value(function(d) { return d.size; });

      arc = d3.svg.arc()
          .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x))); })
          .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx))); })
          .innerRadius(function(d) { return Math.max(0, y(d.y)); })
          .outerRadius(function(d) { return Math.max(0, y(d.y + d.dy)); });

      root = format4pie(data);
      var node = root;
      path = svg.datum(root).selectAll("path")
        .data(partition.nodes)
          .enter().append("path")
            .attr("d", arc)
            .attr("id", function(d) { return "path-"+d.name; })
            .style("fill", function(d) { return color(d); })
            .on("click", click)
            .on("mouseover", mouseover)
            .on("mouseout", mouseout)
            .each(stash);

        // var labels = svg.append("g").selectAll("text")
        //   .data(partition.nodes)
        //   .enter().append("text")
        //     .attr("id", function(d) { return "#path-text-"+d.name; })
        //     .attr("x", 10)
        //     .attr("dy", 20)
        //     .append("textPath")
        //       .attr("xlink:href", function(d) { return "#path-"+d.name; })
        //       .text(function(d) { return d.name; });
        //       //console.log(getBoundingBoxCenter(d3.select("#path-"+d.name)));

        d3.select(self.frameElement).style("height", height + "px");
    });
  };

  function format4pie(data) {
    var catData = {}
    var maxVal = 0;
    for (i in data.ext_file_count) { maxVal = Math.max(maxVal, data.ext_file_count[i].num_files); }

    for (i in data.ext_file_count) {
      var ext = data.ext_file_count[i].ext;
          ext = ext.replace(/[\W_]+/g,"");
          ext = ext.toLowerCase();
      if (ext === '') continue;
      if (ext === 'py' && hidePyFiles) continue;
      if (ext === 'pyc' && hidePyFiles) continue;

      var cat = ext2cat(ext);
      if (cat=="") continue;

      var val = 1 * data.ext_file_count[i].num_files;
      if (val < maxVal * ignoreLower) continue;

      if (!(cat in catData)) {
        catData[cat] = {
          "cat": cat,
          "name": cat,
          "layer": 'cat',
          "children": []
        };
        catCounter[cat] = 1;
      }
      catData[cat].children.push({
        "cat": cat,
        "name": ext,
        "layer": 'ext',
        "size": val,
        "counter": catCounter[cat],
      });
      catCounter[cat]++;
    }
    var returnData = {
       "cat": "all",
       "name": "all",
       "layer": 'top',
       "children": []
    }
    for (key in catData) { returnData.children.push(catData[key]); }
    return returnData;
  }

  function cat2col (cat) {
    if (cat==='all')   return chroma.scale(['#fcdfe6', '#fcdfe6']);
    if (cat==='code')  return chroma.scale(['#c25975', '#86194c']);
    if (cat==='text')  return chroma.scale(['#4978c3', '#A2BAE0']);
    if (cat==='data')  return chroma.scale(['#88b200', '#1c6047']);
    if (cat==='image') return chroma.scale(['#f0bc48', '#c43210']);
    return chroma.scale(['#dddde1', '#59596a']);
  }

  function ext2cat (ext) {
    var ext = ext.toLowerCase();
    if (['py','html','htm','css','pyc','js','php','cpp','h','sh','jar','cgi','java','rb','c'].indexOf(ext) > -1) return 'code';
    if (['markdown','md','txt','pdf'].indexOf(ext) > -1) return 'text';
    if (['json','xml','sql','csv'].indexOf(ext) > -1) return 'data';
    if (['jpg','jpeg','png','gif','ttf','svg'].indexOf(ext) > -1) return 'image';
    return 'other';
  }

  function mouseover(d) {
    if (d.children) $('#ext-info').html(':'+d.name); else $('#ext-info').html('.'+d.name);
  }

  function mouseout() {
    $('#ext-info').html('');
  }

  function click(d) {
    if (d.layer===currentLayer) node = d.parent; else node = d;
    if (d.layer==='ext') node = d.parent;
    if (node==undefined) return;

    path.transition()
      .duration(1000)
      .attrTween("d", arcTweenZoom(node));
    currentLayer = node.layer;
    svg.selectAll('.layer-ext').classed('hidden', false);
    svg.selectAll('.layer-cat').classed('hidden', true);
  }

  // When switching data: interpolate the arcs in data space.
  function arcTweenData(a, i) {
    var oi = d3.interpolate({x: a.x0, dx: a.dx0}, a);
    function tween(t) {
      var b = oi(t);
      a.x0 = b.x;
      a.dx0 = b.dx;
      return arc(b);
    }
    if (i == 0) {
     // If we are on the first arc, adjust the x domain to match the root node
     // at the current zoom level. (We only need to do this once.)
      var xd = d3.interpolate(x.domain(), [node.x, node.x + node.dx]);
      return function(t) {
        x.domain(xd(t));
        return tween(t);
      };
    } else {
      return tween;
    }
  }

  // When zooming: interpolate the scales.
  function arcTweenZoom(d) {
    var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
        yd = d3.interpolate(y.domain(), [d.y, 1]),
        yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
    return function(d, i) {
      return i
          ? function(t) { return arc(d); }
          : function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); return arc(d); };
    };
  }

  // Setup for switching data: stash the old values for transition.
  function stash(d) {
    d.x0 = d.x;
    d.dx0 = d.dx;
  }

  var applySettings = function() {
    currentLayer = 'top';
    svg.transition()
    .duration(750).attr("transform", "scale(23)").style("opacity", 0)
    .each("end", function() { draw(); });
    // draw();
    $(this).closest('.modal').modal('hide');
  };
