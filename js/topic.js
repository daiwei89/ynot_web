
// closure
(function() {

 var topicWordFile = "data/20news_K10.top_words",
     docFile = "data/20news_K10.docs",
     docTopicFile = "data/20news_K10.doc_topic";

 // topic[i] is array of words for topic i.
 var topics = [];

 // docTopics[0] is the doc-topic for the first doc.
 var docTopics;

 var docs;

 var numTopics = 10;

 var minWeight = 1,
     maxWeight = 0;

 var wCanvas = 800, // width of canvas. Need to change topic.css accordingly.
     hCanvas = 800.
     wCloud = 140,   // width of a word cloud.
     hCloud = 140,
     simplexRadius = 200;

 var animateDuration = 1000;  // in ms.

 var mouseoverOpac = 1;
 var mouseoutOpac = 0.7;

 var svgTopic = d3.select("#svgTopic").append("svg")
   .attr("width", wCanvas)
   .attr("height", hCanvas);

 // word_counts[i] is array of counts for words in topic i.
 var word_counts = [];

 var fill = d3.scale.category20();
 var backgroundFill = d3.scale.category10();  // topic bubble colors.

 var vis = function() {

   var topicCircle = svgTopic.append("circle")
     .transition().duration(animateDuration)
     .attr("cx", wCanvas / 2)
     .attr("cy", hCanvas / 2)
     .attr("r", simplexRadius)
     .attr("stroke-width", 1)
     .attr("stroke", "white");

   // let draw knows which topic it is at.
   var topicCounter = 0;

   var cloudOffset = (wCanvas / 2 - simplexRadius) / 2;
   var xScale = d3.scale.linear()
     .domain([-1, 1])
     .range([cloudOffset, wCanvas - cloudOffset]);
   var yScale = d3.scale.linear()
     .domain([-1, 1])
     .range([hCloud / 2, hCanvas - hCloud / 2]);

   // scaling for Doc dots.
   var xScaleDoc = d3.scale.linear()
     .domain([-1, 1])
     .range([wCanvas / 2 - simplexRadius, wCanvas / 2 + simplexRadius]);
   var yScaleDoc = d3.scale.linear()
     .domain([-1, 1])
     .range([hCanvas / 2 - simplexRadius, hCanvas / 2 + simplexRadius]);

   // coordinates of the invisible topic polygon circumscribing the visible
   // circle..
   var polygonVerticesScaled = [];
   var polygonVertices = [];
   for (var k = 0; k < numTopics; k++) {
     var angle = 2 * Math.PI * k / numTopics;
     polygonVertices.push([Math.cos(angle), Math.sin(angle)]);
     polygonVerticesScaled
       .push([xScale(Math.cos(angle)), yScale(Math.sin(angle))]);
   }

   var layout = d3.layout.cloud().size([wCloud, hCloud]);
   layout.rotate(function() { return 0; });  // no rotation.
   var fontSize = d3.scale.pow().exponent(0.5)
     .range([1, 50]).domain([minWeight, maxWeight]);
   for (var i = 0; i < numTopics; i++) {
     layout.words(topics[i].map(function(d) {
           return {text: d.word, size: fontSize(d.count)};
           }))
     .font("Impact")
       .fontSize(function(d) { return d.size; })
       .on("end", draw)
       .start();
   }

   function draw(words, bounds) {
     scale = bounds ? Math.min(
         wCloud / Math.abs(bounds[1].x - wCloud / 2),
         wCloud / Math.abs(bounds[0].x - wCloud / 2),
         hCloud / Math.abs(bounds[1].y - hCloud / 2),
         hCloud / Math.abs(bounds[0].y - hCloud / 2)) / 2 : 1;
     var cloudBackground = svgTopic.append("circle");
     cloudBackground.transition().duration(animateDuration)
       .attr("cx", polygonVerticesScaled[topicCounter][0])
       .attr("cy", polygonVerticesScaled[topicCounter][1])
       .attr("r", Math.max(wCloud, hCloud) * 0.6)
       .attr("fill", backgroundFill(topicCounter))
       .attr("opacity", 0.5);

     var aCloud = svgTopic.append("g");

     aCloud.attr("transform",
         "translate(" + polygonVerticesScaled[topicCounter] + ")")
       .selectAll("text")
       .data(words)
       .enter().append("text")
       .transition()
       .duration(animateDuration)
       .style("font-size", function(d) { return d.size + "px"; })
       .style("font-family", "Impact")
       .style("fill", function(d, i) { return fill(i); })
       .attr("text-anchor", "middle")
       .attr("transform", function(d) {
           return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
           })
     .text(function(d) { return d.text; });

     topicCounter++;
   }

   var getDataXpos = function(d) {
     var x = 0;
     for (var k = 0; k < numTopics; k++) {
       x += d[k] * polygonVertices[k][0];
     }
     return xScaleDoc(x);
   };

   var getDataYpos = function(d) {
     var y = 0;
     for (var k = 0; k < numTopics; k++) {
       y += d[k] * polygonVertices[k][1];
     }
     return yScaleDoc(y);
   };

   // Draw the documents.
   var svgDocCircles = svgTopic.append("g");
   svgDocCircles.selectAll("circle").data(docTopics)
     .enter().append("circle")
     .attr("cx", getDataXpos)
     .attr("cy", getDataYpos)
     .attr("r", 5)
     .attr("fill", function(d, i) { return fill(i); })
     .attr("opacity", mouseoutOpac)
     .on("mouseover", function(d, i) {
         d3.select(this).style("opacity", mouseoverOpac);
         $( "#doc-text" ).text(docs[i]);
         })
     .on("mouseout", function() {
         d3.select(this).style("opacity", mouseoutOpac);});
 };

 var parse = function(text) {
   function isBlank(str) {
     return (!str || /^\s*$/.test(str));
   }
   text.split("\n").forEach(function(line) {
       if (isBlank(line)) return;  // last line is empty
       var words = [];
       line.split(" ").forEach(function(word, i) {
         if (i == 0 || word.length == 0) {
         return;   // skip the first column and the last space.
         }
         var pair = word.split(":");
         words.push({word:pair[0], count:+pair[1]});
         ///
         minWeight = (+pair[1] < minWeight) ? +pair[1] : minWeight;
         maxWeight = (+pair[1] > maxWeight) ? +pair[1] : maxWeight;
         ///
         });
       topics.push(words);
       });
   // Now read the doc-topic.
   d3.text(docTopicFile, "text/plain", function(text) {
       var dsv = d3.dsv(" ","text/plain");
       docTopics = dsv.parseRows(text);

       // Read the docs.
       d3.text(docFile, "text/plain", function(text) {
         docs = text.split("\n");
         });
       vis();
       });
 };

 var load_and_draw = function() {
   d3.text(topicWordFile, "text/plain", parse)
 };

 load_and_draw();

})();
