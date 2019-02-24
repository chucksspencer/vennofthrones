<template src="./App.html"></template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import MovieDb from 'moviedb-promise';
import * as _ from 'lodash';
const venn = require('venn.js');
const d3 = require('d3');

@Component({})
export default class Venn extends Vue {
  public tvSearchModel: any = null;
  public movieSearchModel: any = null;
  public mediaType: string = 'movie';

  public leftId: number = 1399; // Hard coded to GoT's ID
  public rightId: number = 0;

  public leftDetails: any = null;
  public rightDetails: any = null;

  public leftActors: any[] = [];
  public rightActors: any[] = [];
  public actorsInBoth: any[] = [];

  public searchComplete: boolean = false;
  public loading = false;
  public loadingProgress = 0;
  public moviedb = new MovieDb('552cf22a781f8cf02259a244af3609e4');

  private searchDelay: number = 250; // for throttling
  private loadingCurrent = 0;
  private loadingTotal = 0;

  public async executeSearch(mediaType: string, rightItemSearchId: number) {
    this.clearD3Diagram();
    this.leftActors = [];
    this.rightActors = [];
    this.actorsInBoth = [];

    this.loadingProgress = 0;
    this.loadingCurrent = 0;
    this.loadingTotal = 0;
    this.loading = true;
    this.searchComplete = false;

    this.rightId = rightItemSearchId;

    this.leftDetails = await this.moviedb.tvInfo({ id: this.leftId });
    this.loadingTotal = this.leftDetails.number_of_seasons;


    if (mediaType === 'movie') {
      this.rightDetails = await this.moviedb.movieInfo({ id: this.rightId });
      const rightCredits = await this.moviedb.movieCredits({
        id: this.rightId,
      });
      this.rightActors = rightCredits.cast;
    } else if (mediaType === 'tv') {
      this.rightDetails = await this.moviedb.tvInfo({ id: this.rightId });
      this.rightDetails.title = this.rightDetails.name;
      this.loadingTotal += this.rightDetails.number_of_seasons;
      this.rightActors = await this.getCastForTvShow(this.rightDetails);
    }
    this.loadingProgress = 0;

    this.leftActors = await this.getCastForTvShow(this.leftDetails);
    this.actorsInBoth = _.intersectionBy(
      this.rightActors,
      this.leftActors,
      'id',
    );

    this.actorsInBoth.forEach((commonActor: any) => {
      const leftActor: any = this.leftActors.find((x) => x.id === commonActor.id);
      commonActor.leftCharacter = leftActor.character;
    });

    // TV shows have names, not titles. Let's hide that for now.
    this.leftDetails.title = this.leftDetails.name;

    this.searchComplete = true;
    this.loading = false;

    this.buildD3diagram();
  }

  private clearD3Diagram() {
    d3.selectAll('svg > *').remove(); 
  }

  private buildD3diagram() {
    const sets = [
      { sets: [this.rightDetails.title], size: this.rightActors.length },
      { sets: [this.leftDetails.title], size: this.leftActors.length },
      {
        sets: [this.rightDetails.title, this.leftDetails.title],
        size: this.actorsInBoth.length,
      },
    ];

    const chart = venn.VennDiagram();
    d3.select('#venn')
      .datum(sets)
      .call(chart);
  }

  private async getCastForTvShow(showDetails: any) {
    const cachedCast = this.getCachedCastById(showDetails.id);
    
    if(cachedCast) {
      return cachedCast;
    }

    let result: any[] = [];
    for (let i = 1; i < showDetails.number_of_seasons; i++) {
      this.loadingCurrent++;
      this.loadingProgress = ((this.loadingCurrent + 2) / this.loadingTotal) * 100;

      const seasonDetails = await this.moviedb.tvSeasonInfo({
        id: showDetails.id,
        season_number: i,
      });

      const seasonMainCast = await this.moviedb.tvSeasonCredits({
        id: showDetails.id,
        season_number: i,
      });
      
      seasonDetails.episodes.forEach((episode: any) => {
        result = result.concat(episode.guest_stars);
      });
      
      result = result.concat(seasonMainCast.cast);

      // Slight delay between searches to avoid hitting the throttling limit for the API
      await new Promise((resolve) => setTimeout(resolve, this.searchDelay));
    }

    result = _.uniqBy(result, 'id');
    this.cacheCastById(result, showDetails.id);
    return result;
  }

  private cacheCastById(cast:any[], id: string) {
    try {
      localStorage.setItem(id, JSON.stringify(cast));      
    } catch (error) {
      return;
    }
  }

  private getCachedCastById(id: string) {
    try {
      const cachedCast = localStorage.getItem(id);
      if (cachedCast) {
        return JSON.parse(cachedCast);
      }
    } catch (error) {
      return null;
    }
  }
}
</script>

<style src="./App.css"></style>
